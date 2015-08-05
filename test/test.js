"use strict";

var expect = require('expect.js');

var SqlTools = require('../bin/sql-tools.js');

describe('sql-tools', function(){
    describe('olap.cube',function(){
        it('do simple task wihtout special cases',function(){
            var sql="SELECT sarasa";
            var datum_vars=[
                {name: 'zone',  place: 'left'},
                {name: 'sales', place: 'data'},
            ];
            var obtained=SqlTools.olap.cube(sql,'zone',datum_vars);
            expect(obtained).to.be('WITH "cube_olap" AS (\n SELECT sarasa)\n SELECT * FROM "cube_olap"\n UNION SELECT \'=TOTAL=\', sum(sales) FROM "cube_olap"');
        });
        it('do simple task with aggregates',function(){
            var sql="SELECT x";
            var datum_vars=[
                {name: 'country', place: 'left', aggLabel:'=SUM='},
                {name: 'state'  , place: 'left', aggLabel:'=SUM='},
                {name: 'kind'   , place: 'top' , aggLabel:'=MAX='},
                {name: 'sales'  , place: 'data'},
                {name: 'items'  , place: 'data'},
            ];
            var obtained=SqlTools.olap.cube(sql,'state',datum_vars);
            expect(obtained).to.be('WITH "cube_olap" AS (\n SELECT x)\n SELECT * FROM "cube_olap"\n UNION SELECT country, \'=SUM=\', kind, sum(sales), sum(items) FROM "cube_olap" GROUP BY country, kind');
        });
        it('search in specialCases',function(){
            var sql="SELECT sarasa";
            var datum_vars=[
                {name: 'zone'        , place: 'left', aggLabel:"'TOTAL'"},
                {name: 'subzone'     , place: 'left', aggLabel:'*T*'},
                {name: 'calification', place: 'data', aggExp:'f(cal)'},
                {name: 'inv'         , place: 'data', aggExp:'min(inv)'},
                {name: 'sales'       , place: 'data'},
            ];
            var obtained=SqlTools.olap.cube(sql,'zone' ,datum_vars);
            expect(obtained).to.be("WITH \"cube_olap\" AS (\n SELECT sarasa)\n SELECT * FROM \"cube_olap\"\n UNION SELECT '''TOTAL''', subzone, f(cal), min(inv), sum(sales) FROM \"cube_olap\" GROUP BY subzone");
        });
        it.skip('add order by clausule',function(){
            var sql="SELECT sarasa";
            var datum_vars=[
                {name: 'zone'        , place: 'left', aggLabel:"'TOTAL'", aggPositionFirst:true, orderFunction:''},
                {name: 'area'        , place: 'top' },
                {name: 'state'       , place: 'top' , aggLabel:"SUM", aggPositionFirst:false},
                {name: 'numerator'   , place: 'data' },
                {name: 'quantity'    , place: 'data' },
            ];
            SqlTools.defaults.aggPositionFirst=true;
            SqlTools.defaults.orderFunction='comun.para_ordenar_numeros';
            var obtained=SqlTools.olap.orderBy(sql,datum_vars);
            expect(obtained).to.be(
                "WITH \"unordered\" AS (\n"+
                " SELECT sarasa)\n"+
                " SELECT * from \"unordered\"\n"+
                " ORDER BY \n"+
                "  zone='''TOTAL''' DESC, (zone),\n"+
                "  area='=TOTAL=' DESC, comun.para_ordenar_numeros(area),\n"+
                "  state='SUM', comun.para_ordenar_numeros(state)"
            );
        });
    });
    describe('olap.orderBy',function(){
        it('must check correct place',function(){
            var sql="SELECT sarasa";
            var datum_vars=[
                {name: 'zone'        , place: 'inex', aggLabel:"'TOTAL'"},
            ];
            try{
                SqlTools.olap.cube(sql,'zone' ,datum_vars);
                expect().fail("debio lanzar una excepcion");
            }catch(err){
                expect(err.message).to.match(/incorrect place in var definition/);
            }
        });
    });
});
