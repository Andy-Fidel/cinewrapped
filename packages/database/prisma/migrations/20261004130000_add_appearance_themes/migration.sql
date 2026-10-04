-- Additive enum change: existing preferences and the SYSTEM default remain valid.
ALTER TYPE "ThemePreference" ADD VALUE IF NOT EXISTS 'OCEAN';
ALTER TYPE "ThemePreference" ADD VALUE IF NOT EXISTS 'FOREST';
ALTER TYPE "ThemePreference" ADD VALUE IF NOT EXISTS 'AMETHYST';
ALTER TYPE "ThemePreference" ADD VALUE IF NOT EXISTS 'ROSE';
ALTER TYPE "ThemePreference" ADD VALUE IF NOT EXISTS 'SUNSET';
