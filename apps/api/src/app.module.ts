import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AppController } from './app.controller.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClubsModule } from './clubs/clubs.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { EnvironmentModule } from './config/environment.module.js';
import { DatabaseModule } from './database/database.module.js';
import { GamificationModule } from './gamification/gamification.module.js';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module.js';
import { InsightsModule } from './insights/insights.module.js';
import { JournalModule } from './journal/journal.module.js';
import { MediaProviderModule } from './media-provider/media-provider.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { SceneIdentificationModule } from './scene-identification/scene-identification.module.js';
import { SocialModule } from './social/social.module.js';
import { SoundtracksModule } from './soundtracks/soundtracks.module.js';
import { LibraryModule } from './library/library.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    EnvironmentModule,
    DatabaseModule,
    CalendarModule,
    AiModule,
    GamificationModule,
    FeatureFlagsModule,
    InsightsModule,
    JournalModule,
    AuthModule,
    ClubsModule,
    UsersModule,
    MediaProviderModule,
    LibraryModule,
    RecommendationsModule,
    SceneIdentificationModule,
    SocialModule,
    SoundtracksModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
