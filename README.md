# sql-tools
olap for sql non-olap engines / and other tools
<!--multilang v0 en:README.md es:LEEME.md -->

<!--lang:es--]

OLAP y otras herramientas para motores de base de datos SQL que no tienen OLAP

[!--lang:*-->

![designing](https://img.shields.io/badge/stability-desgining-red.svg)
[![version](https://img.shields.io/npm/v/sql-tools.svg)](https://npmjs.org/package/sql-tools)
[![downloads](https://img.shields.io/npm/dm/sql-tools.svg)](https://npmjs.org/package/sql-tools)
[![build](https://github.com/codenautas/sql-tools/actions/workflows/node.js.yml/badge.svg)](https://github.com/codenautas/sql-tools/actions/workflows/node.js.yml)
[![coverage](https://img.shields.io/coveralls/codenautas/sql-tools/master.svg)](https://coveralls.io/r/codenautas/sql-tools)
[![climate](https://img.shields.io/codeclimate/github/codenautas/sql-tools.svg)](https://codeclimate.com/github/codenautas/sql-tools)
[![dependencies](https://img.shields.io/david/codenautas/sql-tools.svg)](https://david-dm.org/codenautas/sql-tools)

<!--multilang buttons-->

language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)

<!--lang:en-->

## Install

<!--lang:es--]
## Instalación

[!--lang:*-->

```sh
$ npm install sql-tools
```

<!--lang:en-->

## Main goal

Transfor a SQL sentence in a SQL with totals.

<!--lang:es--]

## Objetivo principal

Transformar una sentencia SQL en otra que obtenga también los totales agrupando por la variable especificada.

[!--lang:en-->

## Definitions

Uses a list of field definition with the form:

attribute | mandatory | use
----------|-----------|-------------------------------------
name      | yes       | name of the field in the database
place     | yes       | 'data' if must be added, 'left' or 'top' if it must apear in the GROUP BY clausule
aggLabel  | for pivot | text to insert in the added rows
aggExp    | no        | the expression when is different to SUM(x)

<!--lang:es--]

## Definición

Usa una lista de definición de campos con los siguientes atributos:

atributo  | obligatorio | uso
----------|-----------|-------------------------------------
name      | sí        | nombre del campo
place     | sí        | 'data' si el campo debe agregarse, 'left' o 'top' si debe pertenecer a la cláusula GROUP BY
aggLabel  | p/pivote  | el texto que debe ponerse en las filas de datos agregados
aggExp    | no        | la expresión de totalización cuando no es SUM(x)

[!--lang:en-->

## Example

<!--lang:es--]

## Ejemplo

[!--lang:*-->

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

<!--lang:en-->

## License

<!--lang:es--]

## Licencia

[!--lang:*-->

[MIT](LICENSE)

.............................