-- Security hardening for an EXISTING TrialBites database.
-- Run once in the Supabase SQL Editor. (New setups get this from schema.sql.)
--
-- The app's form limits food names to 60 characters, but anyone with a login
-- could call Supabase directly and skip the form. These rules make the
-- database itself refuse bad values, whatever sends them.

-- Food names: 1-60 characters, and not only spaces
alter table trials
  add constraint trials_food_name_length
  check (char_length(trim(food_name)) between 1 and 60);

-- Notes: not empty, at most 1000 characters
alter table symptoms
  add constraint symptoms_notes_length
  check (char_length(trim(notes)) between 1 and 1000);
