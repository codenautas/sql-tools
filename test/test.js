"use strict";

var expect = require('expect.js');

var SqlTools = require('../bin/sql-tools.js');

describe('sql-tools', function(){
    it('do simple task wihtout special cases',function(){
        var sql="SELECT sarasa";
        var datum_vars=[
            {name: 'zone', place: 'left'},
            {name: 'sales', place: 'data'},
        ];
        var obtained=SqlTools.olap.cube(sql,{name:'zone', label:'=TOTAL='},datum_vars);
        expect(obtained).to.be('WITH "cube_olap" AS (\n SELECT sarasa)\n SELECT * FROM "cube_olap"\n UNION SELECT \'=TOTAL=\', sum(sales) FROM "cube_olap"');
    });
    it('do simple task wihtout special cases',function(){
        var sql="SELECT x";
        var datum_vars=[
            {name: 'country', place: 'left'},
            {name: 'state', place: 'left'},
            {name: 'kind', place: 'top'},
            {name: 'sales', place: 'data'},
            {name: 'items', place: 'data'},
        ];
        var obtained=SqlTools.olap.cube(sql,{name:'state', label:'=SUM='},datum_vars);
        expect(obtained).to.be('WITH "cube_olap" AS (\n SELECT x)\n SELECT * FROM "cube_olap"\n UNION SELECT country, \'=SUM=\', kind, sum(sales), sum(items) FROM "cube_olap" GROUP BY country, state');
    });
    it('search in specialCases',function(){
        var sql="SELECT sarasa";
        var datum_vars=[
            {name: 'zone', place: 'left'},
            {name: 'calification', place: 'data'},
            {name: 'inv', place: 'data'},
            {name: 'sales', place: 'data'},
        ];
        var obtained=SqlTools.olap.cube(sql,{name:'zone', label:'*T*'},datum_vars,{calification:'f(cal)', inv:'min(inv)'});
        expect(obtained).to.be('WITH "cube_olap" AS (\n SELECT sarasa)\n SELECT * FROM "cube_olap"\n UNION SELECT \'*T*\', f(cal), min(inv), sum(sales) FROM "cube_olap"');
    });
});
