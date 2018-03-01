﻿"use strict";

var expect = require('expect.js');

var SqlTools = require('../bin/sql-tools.js');

var pg = require('pg-promise-strict');

var MiniTools = require('mini-tools');

var changing = require('best-globals').changing;

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
    var struct_songs={
        tableName:'songs',
        pkFields:[{fieldName:'album_id'}, {fieldName:'song_num'}],
        childTables:[],
    };
    var struct_albums={
        tableName:'albums',
        pkFields:[{fieldName:'id'}],
        childTables:[
            changing(struct_songs,{fkFields: [{target:'id', source:'album_id'}]})
        ]
    };
    var struct_artists={
        tableName:'artists',
        pkFields:[{fieldName:'id'}],
        foreignKeys:[],
        childTables:[
            changing(struct_albums,{fkFields: [{target:'id', source:'artist_id'}]})
        ]
    };
    var struct_record_labels={
        tableName:'record_labels',
        pkFields:[{fieldName:'record_label'}],
        foreignKeys:[],
        childTables:[
            changing(struct_albums,{fkFields: ['record_label']})
        ]
    };
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
        it("reads one song", function(){
            return client.query(SqlTools.structuredData.sqlRead({album_id:1, song_num:1}, struct_songs)).fetchUniqueValue().then(function(result){
                expect(result.value).to.eql({
                    song_num:1, 
                    song_name:"Let's Stick Together",
                    length: null, 
                    genre: 'rock',
                    album_id:1,
                })
            });
        });
        it("reads one album", function(){
            return client.query(SqlTools.structuredData.sqlRead({id:1}, struct_albums)).fetchUniqueValue().then(function(result){
                expect(result.value).to.eql({
                    id:1,
                    artist_id:101,
                    title:'Down in the Groove',
                    year:1988,
                    record_label: 'sonymusic',
                    songs:[
                        {song_num:1, length:null, song_name:"Let's Stick Together", genre: 'rock'},
                        {song_num:2, length:null, song_name:"When Did You Leave Heaven?", genre: 'blues'},
                    ]
                })
            });
        });
        it("reads one artist", function(){
            return client.query(SqlTools.structuredData.sqlRead({id:101}, struct_artists)).fetchUniqueValue().then(function(result){
                expect(result.value).to.eql({
                    id:101,
                    name:'Bob',
                    lastname:'Dylan',
                    albums:[{
                        id:1,
                        title:'Down in the Groove',
                        year:1988,
                        record_label: 'sonymusic',
                        songs:[
                            {song_num:1, length:null, song_name:"Let's Stick Together", genre: 'rock'},
                            {song_num:2, length:null, song_name:"When Did You Leave Heaven?", genre: 'blues'},
                        ]
                    },{
                        id:2,
                        title:'Tempest',
                        record_label: 'wb',
                        year:2012,
                        songs:[]
                    }]
                })
            });
        });
    });
    describe('sqlWrite', function(){
        it("write an album, delete 1st song, update 2nd, insert 3rd, change album year", function(){
            var data={
                id:1,
                title:'Down in the Groove',
                year:1989,
                songs:[
                    {song_num:2, song_name:"When Did You Leave Heaven?", "length": "2:15"},
                    {song_num:3, song_name:"Sally Sue Brown"}, 
                ]
            }
            var queries = SqlTools.structuredData.sqlWrite({id:1}, struct_albums, data);
            return queries.reduce(function(promise, query){
                return promise.then(function() {
                    return client.query(query).execute();
                });
            }, Promise.resolve()).then(function(){
                return client.query("select * from songs where album_id=$1 and song_num=$2",[1,1]).fetchOneRowIfExists();
            }).then(function(result){
                expect(result.rowCount).to.eql(0);
                return client.query("select * from songs where album_id=$1 and song_num=$2",[1,2]).fetchUniqueRow();
            }).then(function(result){
                expect(result.row.length).to.eql("2:15");
                return client.query("select * from songs where album_id=$1 and song_num=$2",[1,3]).fetchUniqueRow();
            }).then(function(result){
                expect(result.row).to.eql({album_id: 1, song_num:3, song_name:"Sally Sue Brown", length:null, genre: null});
            });
        });
    });
  });
});
