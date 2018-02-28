"use strict";

var SqlTools={};

SqlTools.defaults={
    aggLabel: '=TOTAL='
};

SqlTools.places={
        left:{groupby:true},
        top :{groupby:true},
        data:{aggregate:true}
};

SqlTools.olap={};

function coalesce(){
    var i=0;
    while(i<arguments.length-1 && arguments[i]==null) i++;
    return arguments[i];
};

SqlTools.olap.cube=function(sql, pivotVar, varsDef){
    var consulta = 'WITH "cube_olap" AS (\n ' + sql + ')\n SELECT ';
    var arrGroup = [];
    var expSelect = [];
    for (var i=0; i < varsDef.length; i++) {
        var varDef=varsDef[i];
        if (!SqlTools.places[varDef.place]){
            throw new Error('SqlTools.olap.cube: incorrect place in var definition');
        } else if (varDef.name == pivotVar){
            expSelect.push('\'' + coalesce(varDef.aggLabel, SqlTools.defaults.aggLabel).replace(/'/g, "''") + '\'');
        } else if (SqlTools.places[varDef.place].groupby) {
            expSelect.push(varDef.name+'::text');
            arrGroup.push(varDef.name);
        } else {
            expSelect.push(varDef.aggExp ? varDef.aggExp : 'sum('+ varDef.name +')'); 
        }
    }
    consulta += varsDef.map(function(varDef){ 
        return varDef.name+(SqlTools.places[varDef.place].groupby?'::text':''); 
    }).join(', ');
    consulta += ' FROM "cube_olap"\n UNION SELECT ';
    consulta += expSelect.join(', ')+' FROM "cube_olap"';
    if (arrGroup.length>0){
       consulta += ' GROUP BY ' + arrGroup.join(", ");
    }
    return consulta;
}

SqlTools.olap.orderBy=function(sql, varsDef){
    var expOrderBy = [];
    var consulta = "WITH \"unordered\" AS (\n " + sql + ")\n SELECT * from \"unordered\"\n ORDER BY \n  ";
    for (var i=0; i < varsDef.length; i++) {
        var varDef=varsDef[i];
        if (!SqlTools.places[varDef.place]){
            throw new Error('SqlTools.olap.orderBy: incorrect place in var definition');
        } else if (!SqlTools.places[varDef.place].aggregate){
            //console.log("Funcion: " + coalesce(varDef.orderFunction, SqlTools.defaults.orderFunction));
            var parteOrderBy = varDef.name + "=\'" + 
                coalesce(varDef.aggLabel, SqlTools.defaults.aggLabel).replace(/'/g, "''") + "\'"+
                (coalesce(varDef.aggPositionFirst, SqlTools.defaults.aggPositionFirst) ? ' DESC, ' : ', ') +
                coalesce(varDef.orderFunction, SqlTools.defaults.orderFunction) + '(' + varDef.name + ')';
            expOrderBy.push(parteOrderBy); 
        }
    }
    consulta += expOrderBy.join(',\n  ');
    return consulta;

}

SqlTools.quoteIdent = function(dbObjectName){
    return '"'+dbObjectName.replace(/"/g,'""')+'"';
}

SqlTools.quoteLiteral = function(dbAnyValue){
    return "'"+dbAnyValue.replace(/'/g,"''")+"'";
}

SqlTools.quoteIdentArray = function(dbObjectNameArray){
    return dbObjectNameArray.map(function(value){ return SqlTools.quoteIdent(value); })
    
}

SqlTools.quoteLiteralArray = function(dbAnyValueArray){
    return dbAnyValueArray.map(function(value){ return SqlTools.quoteLiteral(value); })
}

SqlTools.structuredData={};

SqlTools.structuredData.sqlRead = function sqlRead(pk, structuredData, globalInfo, inheritedKeys, parentStructure){
    var outer=!globalInfo;
    if(!globalInfo){
        globalInfo={parameterCount:0, parameterValues:[]};
    }
    if(!inheritedKeys){
        inheritedKeys=[];
    }
    var q_alias=SqlTools.quoteIdent(structuredData.alias||structuredData.tableName);
    var q_table=SqlTools.quoteIdent(structuredData.tableName);
    var where_expr;
    var skipColumns=[];
    if(outer){
        where_expr=structuredData.pkFields.map(function(fieldDef){
            globalInfo.parameterValues.push(pk[fieldDef.fieldName]);
            return q_alias+'.'+SqlTools.quoteIdent(fieldDef.fieldName)+' = $'+globalInfo.parameterValues.length;
        }).join(' and ');
    }else{
        where_expr=inheritedKeys.map(function(pairDef){
            skipColumns.push(' - '+SqlTools.quoteLiteral(pairDef.source));
            var parent_q_alias = SqlTools.quoteIdent(parentStructure.alias||parentStructure.tableName);
            return q_alias+'.'+SqlTools.quoteIdent(pairDef.source)+' = '+parent_q_alias+'.'+SqlTools.quoteIdent(pairDef.target);
        }).join(' and ');
    }
    var subQueries=structuredData.childTables.map(function(childTable){
        var query = SqlTools.structuredData.sqlRead({}, childTable, globalInfo, /*inheritedKeys.concat*/(childTable.fkFields), structuredData)
        return `
    || jsonb_build_object('${childTable.tableName}',(${query.text}))
`;
    }).join('');
    return {
        text: `
select coalesce(jsonb_agg(to_jsonb(${q_alias}.*) ${skipColumns.join('')} ${subQueries}),'[]'::jsonb)
  from ${structuredData.tableName} as ${q_alias}
  where ${where_expr}
`,
        values: globalInfo.parameterValues
    }
}

SqlTools.structuredData.sqlsDeletes = function sqlsDeletes(pk, structuredData, data, parentData, parentStructureData, queriesArray){
    if(structuredData.childTables && structuredData.childTables.length){
        structuredData.childTables.forEach(function(childTable){
            if(parentStructureData){
                data.forEach(function(elem){
                    queriesArray = SqlTools.structuredData.sqlsDeletes(pk, childTable, elem[childTable.tableName], elem, structuredData, queriesArray);
                })
            }else{
                queriesArray = SqlTools.structuredData.sqlsDeletes(pk, childTable, data[childTable.tableName], data, structuredData, queriesArray);    
            }
        });
    }
    if(parentStructureData){
        var condition = [];
        data.forEach(function(elem){
            structuredData.pkFields.forEach(function(field){
                if(elem[field.fieldName]){
                    condition.push(field.fieldName + ' <> ' + elem[field.fieldName]);
                }else{
                    condition.push(
                        field.fieldName + ' = ' + parentData[structuredData.fkFields.find(function(fkField){ 
                            return fkField.source === field.fieldName
                        }).target]
                    );
                }
            })
        })
        parentStructureData.pkFields.forEach(function(field){
            if(parentData[structuredData.fkFields.find(function(elem){ return elem.target === field.fieldName}).source]){
                condition.push(field.fieldName + ' = ' + parentData[field.fieldName]);
            }
        });
        queriesArray.push("delete from " + structuredData.tableName + " where " + condition.join(' and ') + ";");
    }
    return queriesArray
}

SqlTools.structuredData.sqlsUpserts = function sqlsUpserts(pk, structuredData, data, parentData, parentStructureData, queriesArray){
    var upsertRecord = function upsertRecord(pk, structuredData, data, parentData, parentStructureData, queriesArray){
        var fields = [];
        var values = [];
        for(var key in data){
            if(!Array.isArray(data[key])){
                fields.push(key.toString());
                values.push(data[key].toString());
            }
        }
        if(structuredData.fkFields){
            structuredData.fkFields.forEach(function(fkField){
               fields.push(fkField.source); 
               values.push(parentData[fkField.target].toString());
            });
        }
        var pkFields = structuredData.pkFields.map(function(field){
            return field.fieldName;
        });
        var fieldsWithoutPk = fields.slice();
        var valuesWithoutPk = values.slice();
        var pkValues = [];
        pkFields.forEach(function(pkField){
            var i = fieldsWithoutPk.indexOf(pkField);
            if(i !== -1){
                fieldsWithoutPk.splice(i,1);
                pkValues.push(valuesWithoutPk[i].toString());
                valuesWithoutPk.splice(i,1);
            }
        });
        var where_expr = [];
        for(var i in pkFields){
            where_expr.push(structuredData.tableName + '.' + SqlTools.quoteIdent(pkFields[i]) + '=' + SqlTools.quoteLiteral(pkValues[i]));
            
        }
        var query = `
            insert into ` + structuredData.tableName + ` ( ` + fields.join(',') + `)
                values (` + SqlTools.quoteLiteralArray(values).join(',') + `)
                on conflict (` + pkFields.join(',') + `)
                do update set (` + fieldsWithoutPk.join(',') + `) = (` + SqlTools.quoteLiteralArray(valuesWithoutPk).join(',') + `)
                    where ` + where_expr.join(' and ') + `;`
        queriesArray.push(query);
        return queriesArray;
    }
    if(data.length){
        data.forEach(function(elem){
            queriesArray = upsertRecord(pk, structuredData, elem, parentData, parentStructureData, queriesArray)
        });
    }else{
        queriesArray = upsertRecord(pk, structuredData, data, parentData, parentStructureData, queriesArray);
    }
    if(structuredData.childTables && structuredData.childTables.length){
        structuredData.childTables.forEach(function(childTable){
            if(parentStructureData){
                data.forEach(function(elem){
                    queriesArray = SqlTools.structuredData.sqlsUpserts(pk, childTable, elem[childTable.tableName], elem, structuredData, queriesArray);
                })
            }else{
                queriesArray = SqlTools.structuredData.sqlsUpserts(pk, childTable, data[childTable.tableName], data, structuredData, queriesArray);    
            }
        });
    }
    return queriesArray
}

SqlTools.structuredData.sqlsWrite = function sqlWrite(pk, structuredData, data){
    return SqlTools.structuredData.sqlsDeletes(pk, structuredData, data, null, null, [])
    .concat(
        SqlTools.structuredData.sqlsUpserts(pk, structuredData, data, null, null, [])
    );
}
module.exports=SqlTools;
