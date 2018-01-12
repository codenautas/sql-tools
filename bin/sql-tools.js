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

SqlTools.structuredData.sqlsDeletes = function sqlsDeletes(pk, structuredData){
    return {
        text: ``
    }
}

SqlTools.structuredData.sqlsWrite = function sqlWrite(pk, structuredData){
    return SqlTools.structuredData.sqlsDeletes(pk, structuredData).concat(
        SqlTools.structuredData.sqlsUpdates(pk, structuredData)
    ).concat(
        SqlTools.structuredData.sqlsInserts(pk, structuredData)
    );
}

module.exports=SqlTools;
