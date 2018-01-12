"use strict";

var expect = require('expect.js');

var SqlTools = require('../bin/sql-tools.js');

var pg = require('pg-promise-strict');

var MiniTools = require('mini-tools');

describe('sql-tools', function(){
  describe('olap',function(){
    describe('cube',function(){
        it('do simple task wihtout special cases',function(){
            var sql="SELECT sarasa";
            var datum_vars=[
                {name: 'zone',  place: 'left'},
                {name: 'sales', place: 'data'},
            ];
            var obtained=SqlTools.olap.cube(sql,'zone',datum_vars);
            expect(obtained).to.be('WITH "cube_olap" AS (\n SELECT sarasa)\n SELECT zone::text, sales FROM "cube_olap"\n UNION SELECT \'=TOTAL=\', sum(sales) FROM "cube_olap"');
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
            expect(obtained).to.be('WITH "cube_olap" AS (\n SELECT x)\n SELECT country::text, state::text, kind::text, sales, items FROM "cube_olap"\n UNION SELECT country::text, \'=SUM=\', kind::text, sum(sales), sum(items) FROM "cube_olap" GROUP BY country, kind');
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
            expect(obtained).to.be("WITH \"cube_olap\" AS (\n SELECT sarasa)\n SELECT zone::text, subzone::text, calification, inv, sales FROM \"cube_olap\"\n UNION SELECT '''TOTAL''', subzone::text, f(cal), min(inv), sum(sales) FROM \"cube_olap\" GROUP BY subzone");
        });
        it('add order by clausule',function(){
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
    describe('orderBy',function(){
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
  describe('structuredData', function(){
    var connectParams = {
        user: 'test_user',
        password: 'test_pass',
        database: 'test_db',
        host: 'localhost',
        port: 5432
    }
    var client;
    var poolLog;
    var unique_struct_albums={
        pkFields:[{fieldName:'id'}],
        tableName:'albums',
        childTables:[]
    }
    var struct_albums={
        tableName:'albums',
        pkFields:[{fieldName:'id'}],
        childTables:[{
            tableName:'songs',
            pkFields:[{fieldName:'album_id'}, {fieldName:'song_num'}],
            fkFields:[{target:'id', source:'album_id'}],
            childTables:[],
        }]
    }
    var struct_artist_production={
        tableName:'artists',
        pkFields:[{fieldName:'artist_id'}],
        childTables:[{
            tableName:'albums',
            pkFields:[{fieldName:'id'}],
            fkFields:[{target:'artist_id', source:'artist_id'}],
            childTables:[{
                tableName:'songs',
                pkFields:[{fieldName:'album_id'}, {fieldName:'song_num'}],
                fkFields:[{target:'id', source:'album_id'}],
                childTables:[],
            }]
        }]
    }
    before(function(){
        pg.setAllTypes();
        pg.easy=true;
        return MiniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
            return pg.connect(config.db);
        }).then(function(returnedClient){
            // if(pg.poolBalanceControl().length>0) done(new Error("There are UNEXPECTED unbalanced conections"));
            pg.easy=false;
            client = returnedClient;
            return client.executeSqlScript('install/structured-data.sql');
        });
    });
    after(function(){
        client.done();
        setTimeout(function(){
            process.exit();
        },1000);
    });
    describe('sqlRead', function(){
        it("reads one album without inner data", function(){
            return client.query(SqlTools.structuredData.sqlRead({id:1}, unique_struct_albums)).fetchUniqueValue().then(function(result){
                expect(result.value).to.eql([{
                    id:1,
                    artist_id:101,
                    title:'Down in the Groove',
                    year:1988,
                }])
            });
        });
        it("reads one album", function(){
            return client.query(SqlTools.structuredData.sqlRead({id:1}, struct_albums)).fetchUniqueValue().then(function(result){
                expect(result.value).to.eql([{
                    id:1,
                    artist_id:101,
                    title:'Down in the Groove',
                    year:1988,
                    songs:[
                        {song_num:1, length:null, song_name:"Let's Stick Together"},
                        {song_num:2, length:null, song_name:"When Did You Leave Heaven?"},
                    ]
                }])
            });
        });
        it("reads one artist", function(){
            console.log(SqlTools.structuredData.sqlRead({artist_id:101}, struct_artist_production).text);
            return client.query(SqlTools.structuredData.sqlRead({artist_id:101}, struct_artist_production)).fetchUniqueValue().then(function(result){
                expect(result.value).to.eql([{
                    artist_id:101,
                    name:'Bob Dylan',
                    albums:[{
                        id:1,
                        title:'Down in the Groove',
                        year:1988,
                        songs:[
                            {song_num:1, length:null, song_name:"Let's Stick Together"},
                            {song_num:2, length:null, song_name:"When Did You Leave Heaven?"},
                        ]
                    },{
                        id:2,
                        title:'Another Side of Bob Dylan',
                        year:1964,
                        songs:[]
                    }]
                }])
            });
        });
    });
    describe('sqlWrite', function(){
        it("delete 1fs, update 2nd, insert 3er", function(){
            var data={
                id:1,
                title:'Down in the Groove',
                year:1989,
                songs:[
                    {song_num:2, song_name:"When Did You Leave Heaven?", "length": "2:15"},
                    {song_num:3, song_name:"Sally Sue Brown"}, 
                ]
            }
            var queries = SqlTools.structuredData.sqlsWrite({id:1}, struct_albums, data);
            return queries.reduce(function(promise, query){
                return promise.then(function() {
                    return client.query(query).execute();
                });
            }, Promise.resolve()).then(function(){
                return client.query("select * from songs where album_id=$1 and song_num=$2",1,1).fetchRowIfExists();
            }).then(function(result){
                expect(result.rowCount).to.eql(0);
                return client.query("select * from songs where album_id=$1 and song_num=$2",1,2).fetchUniqueRow();
            }).then(function(result){
                expect(result.row.length).to.eql("2:15");
                return client.query("select * from songs where album_id=$1 and song_num=$2",1,3).fetchUniqueRow();
            }).then(function(result){
                expect(result.row).to.eql({song_num:3, song_name:"Sally Sue Brown", length:null});
            });
        });
    });
  });
});
