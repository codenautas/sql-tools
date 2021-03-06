<!-- multilang from README.md




NO MODIFIQUE ESTE ARCHIVO. FUE GENERADO AUTOMÁTICAMENTE POR multilang.js




-->
# sql-tools
olap for sql non-olap engines / and other tools


OLAP y otras herramientas para motores de base de datos SQL que no tienen OLAP


![designing](https://img.shields.io/badge/stability-desgining-red.svg)
[![version](https://img.shields.io/npm/v/sql-tools.svg)](https://npmjs.org/package/sql-tools)
[![downloads](https://img.shields.io/npm/dm/sql-tools.svg)](https://npmjs.org/package/sql-tools)
[![build](https://img.shields.io/travis/codenautas/sql-tools/master.svg)](https://travis-ci.org/codenautas/sql-tools)
[![coverage](https://img.shields.io/coveralls/codenautas/sql-tools/master.svg)](https://coveralls.io/r/codenautas/sql-tools)
[![climate](https://img.shields.io/codeclimate/github/codenautas/sql-tools.svg)](https://codeclimate.com/github/codenautas/sql-tools)
[![dependencies](https://img.shields.io/david/codenautas/sql-tools.svg)](https://david-dm.org/codenautas/sql-tools)

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)

## Instalación


```sh
$ npm install sql-tools
```


## Objetivo principal

Transformar una sentencia SQL en otra que obtenga también los totales agrupando por la variable especificada.


## Definición

Usa una lista de definición de campos con los siguientes atributos:

atributo  | obligatorio | uso
----------|-----------|-------------------------------------
name      | sí        | nombre del campo
place     | sí        | 'data' si el campo debe agregarse, 'left' o 'top' si debe pertenecer a la cláusula GROUP BY
aggLabel  | p/pivote  | el texto que debe ponerse en las filas de datos agregados
aggExp    | no        | la expresión de totalización cuando no es SUM(x)


## Ejemplo


```js
var olap = require('sql-tools').olap;

var varsDef=[
  {name: "zone", place:"left", aggLabel:"=SUM="}, 
  {name: "kind", place:"left"},
  {name: "sales", place:"data"},
  {name: "calif", place:"data", aggExp:"min(calif)"}
];

var sql_total=olap.cube("select * from sales", 'zone', varsDef);

console.log(sql_total);
/*
WITH "olap cube" AS (
 select * from sales
) SELECT * FROM "olap cube"
UNION SELECT '=SUM=', kind, SUM(sales), min(calif)
  FROM "olap cube"
  GROUP BY kind
*/
```


## Licencia


[MIT](LICENSE)

.............................