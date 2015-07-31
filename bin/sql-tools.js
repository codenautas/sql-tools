"use strict";

var SqlTools={};

SqlTools.olap={};

SqlTools.olap.cube=function(sql, pivotVar, varsDef){
	var consulta = 'WITH "cube_olap" AS (\n ' + sql + ')\n SELECT * FROM "cube_olap"\n UNION SELECT ';
	var aggExp = '';
	var varsNoPivot = '';
	var arrGroup = [];
	for (var i=0; i < varsDef.length; i++) {
		if (varsDef[i].name == pivotVar){
			var aggLabel = varsDef[i].aggLabel; 
		}
		else {
			if (varsDef[i].place == 'left' || varsDef[i].place == 'top') {
				varsNoPivot = varsNoPivot + ', ' + varsDef[i].name;
			}
		}
		if (varsDef[i].place == 'left') {
			arrGroup.push(varsDef[i].name);
		}
		if (varsDef[i].place == 'data'){
			aggExp = aggExp + (varsDef[i].aggExp ? ', ' + varsDef[i].aggExp : ', sum('+ varsDef[i].name +')'); 
		}
	}
	consulta = consulta + '\'' + aggLabel + '\'' + varsNoPivot + aggExp;
	consulta = consulta + ' FROM "cube_olap"';
	var parteGroup = '';
	if (arrGroup.length>1){
	   parteGroup = ' GROUP BY ' + arrGroup.join(", ");
	}
	consulta = consulta + parteGroup; 
	return consulta;
}

module.exports=SqlTools;