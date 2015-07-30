# Estudio preliminar de sql-tools

## Objetivo

Usarlo junto con tabulator para poner totales en los tabulados. 
Los totales los queremos calcular en el SQL

## Ejemplos:

Uso

```js
var olap = require('sql-tools').olap;

var sql=inte.sqlNames(
    "  SELECT #var_fila1 ::text, #var_col1 ::text, count(*) as numerador,"+
    "     sum(count(*)) over (partition by #var_fila1) as denominador "+ 
    " FROM encu.plana_s1_p sp INNER JOIN encu.plana_i1_ i ON sp.pla_enc=i.pla_enc and sp.pla_hog=i.pla_hog and sp.pla_mie=i.pla_mie "+
    " INNER JOIN encu.plana_tem_ t ON i.pla_enc=t.pla_enc"+
    " GROUP BY #var_fila1, #var_col1 ORDER BY comun.para_ordenar_numeros(#var_fila1::text),  comun.para_ordenar_numeros(#var_col1::text)"
    ,
    parametros
);
sql=olap.cube(sql, parametros.var_fila1,datum.vars ,{denominador:'sum(numerador)'});
sql=olap.cube(sql, parametros.var_col1, datum.vars );
```

para generar algo como:

```sql
with tira as (
   -- dentro
   SELECT pla_sexo ::text, pla_comuna ::text, count(*) as numerador, sum(count(*)) over (partition by pla_sexo) as denominador 
     FROM encu.plana_s1_p sp INNER JOIN encu.plana_i1_ i ON sp.pla_enc=i.pla_enc and sp.pla_hog=i.pla_hog and sp.pla_mie=i.pla_mie 
       INNER JOIN encu.plana_tem_ t ON i.pla_enc=t.pla_enc
     GROUP BY pla_sexo, pla_comuna ORDER BY comun.para_ordenar_numeros(pla_sexo::text),  comun.para_ordenar_numeros(pla_comuna::text)
   -- dentro
   )

 select *  from tira union
 select '=total=', pla_comuna, sum(numerador), sum(numerador)
   from tira
   group by pla_comuna
   order by 1
```
