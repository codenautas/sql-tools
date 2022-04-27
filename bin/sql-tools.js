"use strict";

(function codenautasModuleDefinition(root, name, factory) {
    /* global define */
    /* istanbul ignore next */
    if(typeof root.globalModuleName !== 'string'){
        root.globalModuleName = name;
    }
    /* istanbul ignore next */
    if(typeof exports === 'object' && typeof module === 'object'){
        module.exports = factory();
    }else if(typeof define === 'function' && define.amd){
        define(factory);
    }else if(typeof exports === 'object'){
        exports[root.globalModuleName] = factory();
    }else{
        root[root.globalModuleName] = factory();
    }
    root.globalModuleName = null;
})(/*jshint -W040 */this, 'SqlTools', function() {
/*jshint +W040 */

/*jshint -W004 */
var SqlTools={};
/*jshint +W004 */

SqlTools.defaults={
    aggLabel: '=TOTAL='
};

SqlTools.places={
    left:{groupby:true},
    top :{groupby:true},
    data:{aggregate:true}
};

SqlTools.olap={};

/** @param {string[]} elements */
function join1wp(elements){
    return (elements.length!=1?'(':'') + elements.join(', ') + (elements.length!=1?')':'');
}

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
    return '"'+dbObjectName.toString().replace(/"/g,'""')+'"';
}

SqlTools.quoteLiteral = function(dbAnyValue){
    return dbAnyValue==null?"null":"'"+dbAnyValue.toString().replace(/'/g,"''")+"'";
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
        return `|| jsonb_build_object('${childTable.tableName}',(${query.text}))`;
    }).join('');
    var select_string = `to_jsonb(${q_alias}.*) ${skipColumns.join('')} ${subQueries} `;
    select_string = parentStructure?`coalesce(jsonb_agg(${select_string}${structuredData.pkFields?" order by "+structuredData.pkFields.map(function(fieldDef){ return fieldDef.fieldName; }).join(','):''}),'[]'::jsonb) `:select_string;
    return {
        text: 
            `
            select ${select_string}
              from ${structuredData.tableName} as ${q_alias}
              where ${where_expr}
            `,
        values: globalInfo.parameterValues
    }
    
}

SqlTools.structuredData.sqlsDeletes = function sqlsDeletes(data, structuredData, queriesArray, parentPks){
    if(structuredData.childTables && structuredData.childTables.length){
        structuredData.childTables.forEach(function(childTable){
            var childPksIndex={};
            Object.assign(childPksIndex, parentPks);
            var conditionChild=childTable.fkFields.map(function(pair){
                if(data[pair.target]!=null){
                    childPksIndex[pair.source]=data[pair.target];
                }
                return pair.source + ' = ' + SqlTools.quoteLiteral(childPksIndex[pair.source])
            });
            (data[childTable.tableName]||[]).forEach(function(childData){
                queriesArray = SqlTools.structuredData.sqlsDeletes(childData, childTable, queriesArray, childPksIndex);    
            });
            var parentPk=childTable.pkFields.filter(function(field){
                return !childPksIndex[field.fieldName];
            }).map(function(field){ return field.fieldName; });
            queriesArray.push(
                "delete from " + SqlTools.quoteIdent(childTable.tableName) + 
                " where " + conditionChild.join(' and ') + 
                " and " + join1wp(parentPk) + `
                 not in (select ${parentPk.join(', ')} from jsonb_populate_recordset(null::${SqlTools.quoteIdent(childTable.tableName)}, 
                    ${SqlTools.quoteLiteral(JSON.stringify(data[childTable.tableName]))}::jsonb
                    ));`
            );
        });
    }
    return queriesArray
}

SqlTools.structuredData.sqlsUpserts = function sqlsUpserts(data, structureData, parentData, parentStructureData, inheritedPks){
    var childQueries = [];
    var fields = [];
    var values = [];
    for(var key in data){
        var childStructuredData = structureData.childTables.find(function(table){
            return table.tableName==key
        });
        var inheritedPksForChild={};
        Object.assign(inheritedPksForChild, inheritedPks);
        if(childStructuredData){
            var childrenData = data[key];
            childrenData.forEach(function(childData){
                structureData.pkFields.forEach(function(pkField) {
                    if (data[pkField.fieldName] != null){
                        inheritedPksForChild[pkField.fieldName] = data[pkField.fieldName]
                    }
                });                
                childQueries=childQueries.concat(SqlTools.structuredData.sqlsUpserts(childData, childStructuredData, data, structureData, inheritedPksForChild))
            })
        }else{
            fields.push(key);
            values.push(data[key]);
        }
    }
    if(structureData.fkFields){
        structureData.fkFields.forEach(function(fkField){
            fields.push(fkField.source); 
            values.push(inheritedPks[fkField.target]);
        });
    }
    var pkFields = structureData.pkFields.map(function(field){
        return field.fieldName;
    });
    var fieldsWithoutPk = fields.slice();
    var valuesWithoutPk = values.slice();
    var pkValues = [];
    pkFields.forEach(function(pkField){
        var i = fieldsWithoutPk.indexOf(pkField);
        if(i !== -1){
            fieldsWithoutPk.splice(i,1);
            pkValues.push(valuesWithoutPk[i]);
            valuesWithoutPk.splice(i,1);
        }
    });
    var where_expr = [];
    for(var i in pkFields){
        where_expr.push(SqlTools.quoteIdent(structureData.tableName) + '.' + SqlTools.quoteIdent(pkFields[i]) + '=' + SqlTools.quoteLiteral(pkValues[i]));
    }
    var doUpdate = ()=>`do update set ( ${SqlTools.quoteIdentArray(fieldsWithoutPk).join(',')} ) = 
    ${fieldsWithoutPk.length == 1?'row':''} ( ${SqlTools.quoteLiteralArray(valuesWithoutPk).join(',')} )
        where ${where_expr.join(' and ')}`
    var query = `
        insert into ${SqlTools.quoteIdent(structureData.tableName)}  ( ${fields.join(',')} )
            values ( ${SqlTools.quoteLiteralArray(values).join(',')} )
            on conflict ( ${SqlTools.quoteIdentArray(pkFields).join(',')} )
            ${(fieldsWithoutPk.length == 0)?' do nothing':doUpdate()} ;`
    childQueries.unshift(query);
    return childQueries;
}

SqlTools.structuredData.sqlWrite = function sqlWrite(data, structuredData){
    return SqlTools.structuredData.sqlsDeletes(data, structuredData,[], {})
    .concat(
        SqlTools.structuredData.sqlsUpserts(data, structuredData, null, null, [], {})
    );
}

return SqlTools;

})
