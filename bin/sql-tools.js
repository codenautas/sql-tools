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

SqlTools.structuredData={};

SqlTools.structuredData.sqlRead = function sqlRead(pk, structuredData, globalInfo, inheritedKeys){
    if(!globalInfo){
        globalInfo={parameterCount:0, aliasCount:{}, parameterValues:[]};
    }
    if(!inheritedKeys){
        inheritedKeys=[];
    }
    var alias=structuredData.tableName+(globalInfo.aliasCount[structuredData.tableName]||'');
    globalInfo.aliasCount[structuredData.tableName]=(globalInfo.aliasCount[structuredData.tableName]||0)+1;
    var q_alias=SqlTools.quoteIdent(alias);
    var q_table=SqlTools.quoteIdent(structuredData.tableName);
    var pk_var_eq_param=structuredData.pkFields.map(function(fieldDef){
        globalInfo.parameterValues.push(pk[fieldDef.fieldName]);
        return q_alias+'.'+SqlTools.quoteIdent(fieldDef.fieldName)+' = $'+globalInfo.parameterValues.length;
    })
    /*
   || jsonb_build_object('songs',(select jsonb_agg(to_jsonb(s.*))
         from ${q_table} s
         where a.id = s.album_id))
    */
    return {
        text: `
select to_jsonb(${q_alias}.*) 
  from ${structuredData.tableName} as ${q_alias}
  where ${pk_var_eq_param};
  `,
        values: globalInfo.parameterValues
    }
}

SqlTools.structuredData.sqlWrite = function sqlWrite(pk, structuredData){
    return {
        text: "select 77+$1",
        values: [1]
    }
}

module.exports=SqlTools;
