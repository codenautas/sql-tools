"use strict";

var SqlTools={};

SqlTools.olap={};

SqlTools.olap.cube=function(sql, pivotVar, varsDef){
    //return "no implementado aún";
	var consulta = 'WITH "cube_olap" AS (\n ' + sql + ')\n SELECT * FROM "cube_olap"\n UNION SELECT ';
	var aggExp = '';
	for (var i=0; i < varsDef.length; i++) {
		if (varsDef[i].name == pivotVar){
			var aggLabel = varsDef[i].aggLabel; 
		}
		if (varsDef[i].place == 'data'){
		    var dataVar = varsDef[i].name;
			aggExp = aggExp + (varsDef[i].aggExp ? varsDef[i].aggExp : ', sum('+dataVar+')'); 
		}
	}
	consulta = consulta + '\'' + aggLabel + '\'' + aggExp;
	consulta = consulta + ' FROM "cube_olap"';
	return consulta;
}

module.exports=SqlTools;