ALTER TABLE public.user_preferences
  ADD COLUMN "annualViewingGoal" INTEGER,
  ADD COLUMN "monthlyViewingGoal" INTEGER,
  ADD CONSTRAINT "user_preferences_annual_goal_range" CHECK ("annualViewingGoal" BETWEEN 1 AND 10000),
  ADD CONSTRAINT "user_preferences_monthly_goal_range" CHECK ("monthlyViewingGoal" BETWEEN 1 AND 10000);
