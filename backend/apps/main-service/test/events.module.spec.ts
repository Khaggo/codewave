import { MODULE_METADATA } from '@nestjs/common/constants';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { EventsModule } from '@shared/events/events.module';

describe('EventsModule', () => {
  it('provides and exports the application event bus', () => {
    const providers =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, EventsModule) ?? [];
    const exports =
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, EventsModule) ?? [];

    expect(providers).toContain(AutocareEventBusService);
    expect(exports).toContain(AutocareEventBusService);
  });
});
