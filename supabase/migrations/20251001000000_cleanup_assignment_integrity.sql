-- Maintain assignment integrity by keeping text assignment flags in sync
-- and removing empty assignments when their texts are deleted.

-- Ensure a text is marked as assigned whenever it is linked to an assignment
CREATE OR REPLACE FUNCTION public.set_text_as_assigned()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.texts
  SET is_assigned = true
  WHERE id = NEW.text_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_text_as_assigned ON public.assignment_texts;
CREATE TRIGGER set_text_as_assigned
AFTER INSERT ON public.assignment_texts
FOR EACH ROW
EXECUTE FUNCTION public.set_text_as_assigned();

-- Ensure a text is marked as available again when removed from an assignment
CREATE OR REPLACE FUNCTION public.unset_text_as_assigned()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.texts
  SET is_assigned = false
  WHERE id = OLD.text_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS unset_text_as_assigned ON public.assignment_texts;
CREATE TRIGGER unset_text_as_assigned
AFTER DELETE ON public.assignment_texts
FOR EACH ROW
EXECUTE FUNCTION public.unset_text_as_assigned();

-- Clean up user assignments that no longer have any texts associated with them
CREATE OR REPLACE FUNCTION public.delete_empty_assignments()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.assignment_texts
    WHERE assignment_id = OLD.assignment_id
  ) THEN
    DELETE FROM public.user_assignments
    WHERE id = OLD.assignment_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS delete_empty_assignments ON public.assignment_texts;
CREATE TRIGGER delete_empty_assignments
AFTER DELETE ON public.assignment_texts
FOR EACH ROW
EXECUTE FUNCTION public.delete_empty_assignments();
