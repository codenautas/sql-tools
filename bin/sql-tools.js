"use strict";

var SqlTools={};

SqlTools.defaults={
    aggLabel: '=TOTAL='
};

SqlTools.olap={};

SqlTools.olap.cube=function(sql, pivotVar, varsDef){
    var places={
        left:{groupby:true},
        top :{groupby:true},
        data:{aggregate:true}
    }
    var consulta = 'WITH "cube_olap" AS (\n ' + sql + ')\n SELECT * FROM "cube_olap"\n UNION SELECT ';
    var arrGroup = [];
    var expSelect = [];
    for (var i=0; i < varsDef.length; i++) {
        var varDef=varsDef[i];
        if (!places[varDef.place]){
            throw new Error('SqlTools.olap.cube: incorrect place in var definition');
        } else if (varDef.name == pivotVar){
            expSelect.push('\'' + (varDef.aggLabel||SqlTools.defaults.aggLabel).replace(/'/g, "''") + '\'');
        } else if (places[varDef.place].groupby) {
            expSelect.push(varDef.name);
            arrGroup.push(varDef.name);
        } else {
            expSelect.push(varDef.aggExp ? varDef.aggExp : 'sum('+ varDef.name +')'); 
        }
    }
    consulta += expSelect.join(', ')+' FROM "cube_olap"';
    if (arrGroup.length>0){
       consulta += ' GROUP BY ' + arrGroup.join(", ");
    }
    return consulta;
}

module.exports=SqlTools;