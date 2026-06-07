
-- Storage policies for event-covers bucket
CREATE POLICY "Users upload own covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own covers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own covers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
