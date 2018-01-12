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

SqlTools.structuredData={};

SqlTools.structuredData.sqlRead = function sqlRead(pk, mainStructuredData){
    var getFKJoinCondition = function(structuredData, parentTableName){
        var foreignKey = structuredData.foreignKeys.find(function(elem){
            return elem.references == parentTableName;
        });
        if(foreignKey){
            return foreignKey.fields.map(function(elem){
                return structuredData.tableName + '.' + elem.source + '=' + parentTableName + '.' + elem.target;
            }).join(" and ");
        }
        return '';
    }
    var getPKJoinCondition = function(pkValues, structuredData){
        if(structuredData.primaryKey && structuredData.primaryKey.length){
            return structuredData.primaryKey.map(function(elem){
                return structuredData.tableName + '.' + elem + '=' + pkValues[elem];
            }).join(" and ");
        }else{
            return 'true';
        }
    }
    var getChildrenStructuresQueryObjects = function(sd, childrenStructuresQueryObjects){
        if(sd.childrenTables){
            sd.childrenTables.forEach(function(childStructure){
                childrenStructuresQueryObjects += 
                        `|| jsonb_build_object('`+ childStructure.tableName + `',
                                                    (select jsonb_agg(to_jsonb(`+ childStructure.tableName +`.*) ` + getChildrenStructuresQueryObjects(childStructure, childrenStructuresQueryObjects) + `)
                                                     from `+ childStructure.tableName +` `+ childStructure.tableName +`
                                                     where ` + getFKJoinCondition(childStructure, sd.tableName)
                                                 + `)
                )`;
            });
        }
        return childrenStructuresQueryObjects;
    }
    var childrenStructuresQueryObjects = getChildrenStructuresQueryObjects(mainStructuredData, '');
    var consulta = 
                    `select
                        to_jsonb(`+mainStructuredData.tableName+`.*) 
                             ` + childrenStructuresQueryObjects +
                    ` from `+ mainStructuredData.tableName + ` ` + mainStructuredData.tableName + `
                    where `+ getPKJoinCondition(pk, mainStructuredData);
    return consulta;
}

SqlTools.structuredData.sqlWrite = function sqlWrite(pk, structuredData){
    return {
        text: "select 77+$1",
        values: [1]
    }
}

module.exports=SqlTools;
