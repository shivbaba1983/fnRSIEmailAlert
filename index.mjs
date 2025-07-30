import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-east-1' });
const RSI_API_URL = 'https://main.d1rin969pdam05.amplifyapp.com/api/rsi';
const ALERT_EMAIL = 'shivbaba1983@gmail.com';

// US Market Holidays (NYSE) for 2025
const marketHolidays2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King, Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving Day
  '2025-12-25', // Christmas Day
];

function isMarketHoliday(date) {
  const estDate = date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // format: YYYY-MM-DD
  return marketHolidays2025.includes(estDate);
}

function isMarketOpenNow() {
  const nowUTC = new Date();
  const nowEST = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'America/New_York' }));

  const day = nowEST.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false; // Weekend check

  if (isMarketHoliday(nowEST)) return false; // Market holiday check

  const hours = nowEST.getHours();
  const minutes = nowEST.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const marketOpen = 9 * 60 + 45; // 9:45 AM EST
  const marketClose = 16 * 60;    // 4:00 PM EST

  return totalMinutes >= marketOpen && totalMinutes <= marketClose;
}

export const handler = async () => {
  try {
    if (!isMarketOpenNow()) {
      console.log('Market is closed (weekend or holiday or out of time window). No alert sent.');
      return;
    }

    const response = await fetch(RSI_API_URL);
    const data = await response.json();
    const latestRSI = data?.rsi;
    const latestDate = data?.date;

    console.log(`RSI API response: ${JSON.stringify(data)}`);

    if (latestRSI < 30) {
      const params = {
        Destination: {
          ToAddresses: [ALERT_EMAIL],
        },
        Message: {
          Body: {
            Text: {
              Data: `ALERT: SPY RSI is below 30.\n\nDate: ${latestDate}\nRSI: ${latestRSI}`,
            },
          },
          Subject: { Data: '🔔 SPY RSI Alert: Below 30' },
        },
        Source: ALERT_EMAIL,
      };

      const command = new SendEmailCommand(params);
      await ses.send(command);

      console.log('Email sent successfully');
    } else {
      console.log('RSI is above 30. No alert sent.');
    }
  } catch (error) {
    console.error('Error checking RSI or sending email:', error);
    throw error;
  }
};
