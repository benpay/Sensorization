const { SensorType, SensorStatus } = require('../generated/prisma/enums');


function validateUrl(req: any, res: any, next: any) {

  const { url } = req.body;
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const parsedUrl = new URL(url);

    // Block dangerous protocols (file://, ftp://, etc.)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTP and HTTPS protocols are allowed.' });
    }

    req.body.url = parsedUrl.href;
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }
}

const validateSensor = async (req: any, res: any, next: any) => {
  try {
    if (!req.body) { return res.status(400).send("Content can not be empty!"); }

    const { sensorName, sensorCode, type, status, url, userId } = req.body;

    if (!sensorName || sensorName.length < 2 || sensorName.length > 10) {
      return res.status(400).send("Sensor name must be between 3 and 10 characters");
    }

    if (!sensorCode || sensorCode.length < 2 || sensorCode.length > 10) {
      return res.status(400).send("Sensor code must be between 3 and 10 characters");
    }

    if (!type || !status || !userId) {
      return res.status(400).send("Any required fields are missing");
    }

    if (type !== SensorType.HTTP_POLL && type !== SensorType.MANUAL_UPLOAD) {
      return res.status(400).send("Type must be either HTTP_POLL or MANUAL_UPLOAD");
    }

    if (type === SensorType.HTTP_POLL) {
      let validationSuccess = false;
      validateUrl(req, res, () => {
        validationSuccess = true;
      });
      if (!validationSuccess) { return; }
    }

    if (status !== SensorStatus.active && status !== SensorStatus.paused) {
      return res.status(400).send("Status must be either active or paused");
    }

    next();
  } catch (err) {
    console.log("Error registering sensor:", err);
    return res.status(400).send("Error registering sensor");
  }
}

module.exports = { validateSensor };