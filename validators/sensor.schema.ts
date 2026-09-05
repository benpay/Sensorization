import { z } from 'zod';
const { SensorType, SensorStatus } = require('../generated/prisma/enums');

export const RegistrarSensorSchema = z.object({

  sensorName: z.string({ error: "Any required fields are missing" })
  .min(2, "Sensor name must be between 3 and 10 characters")
  .max(10, "Sensor name must be between 3 and 10 characters"),

  sensorCode: z.string({ error: "Any required fields are missing" })
  .min(2, "Sensor code must be between 3 and 10 characters")
  .max(10, "Sensor code must be between 3 and 10 characters"),

  type: z.nativeEnum(SensorType, { 
    error: `Invalid sensor type. Allowed values: ${Object.values(SensorType).join(', ')}`,
  }),

  status: z.nativeEnum(SensorStatus, {
    error: `Invalid sensor status. Allowed values: ${Object.values(SensorStatus).join(', ')}`,
  }),

  userId: z.number({
    error: "Any required fields are missing",
  }),

  url: z.string().nullable().optional(),
})

.refine((data) => {
  if (data.type === SensorType.HTTP_POLL && !data.url) {
    return false;
  }
  return true;
}, {
  message: "La URL es obligatoria cuando el tipo es HTTP_POLL",
  path: ["url"]
});
