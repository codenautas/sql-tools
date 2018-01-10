set search_path = sd;

select to_jsonb(a.*) 
   || jsonb_build_object('songs',(select jsonb_agg(to_jsonb(s.*))
         from songs s
         where a.id = s.album_id))
  from albums a
  where a.id=1;