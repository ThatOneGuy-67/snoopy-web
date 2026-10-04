insert into public.site_settings(key, value) values
  ('maintenance_chat','false'), ('maintenance_games','false'),
  ('maintenance_movies','false'), ('maintenance_music','false')
on conflict (key) do nothing;

create or replace function public.set_site_setting(p_key text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_key not in (
    'feature_chat','feature_games','feature_movies','feature_music',
    'maintenance_chat','maintenance_games','maintenance_movies','maintenance_music',
    'maintenance_mode'
  ) then raise exception 'Invalid setting'; end if;
  insert into public.site_settings(key,value,updated_at,updated_by) values (p_key,p_value,now(),auth.uid())
  on conflict (key) do update set value=excluded.value, updated_at=now(), updated_by=auth.uid();
  insert into public.admin_activity_logs(actor_id,action,target_type,target_id,metadata)
    values(auth.uid(),'site_setting_updated','site_setting',p_key,jsonb_build_object('value',p_value));
  return p_value;
end; $$;
