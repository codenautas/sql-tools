"use strict";

var SqlTools={};

SqlTools.olap={};

SqlTools.olap.cube=function(sql, pivotVar, varsDef, specialCases){
    if(!specialCases){
        specialCases={};
    }
    return "no implementado aún";
}

module.exports=SqlTools;