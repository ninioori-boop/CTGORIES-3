export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const API_KEY = process.env.OPENAI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const CATEGORIES = [
    'מזון לבית', 'אוכל בחוץ ובילויים', 'פארם', 'דלק וחניה',
    'מתנות לאירועים ולשמחות', 'ביגוד והנעלה', 'תחב"צ', 'כבישי אגרה',
    'תספורת וקוסמטיקה', 'תחביבים', 'סיגריות', 'חופשה/טיול',
    'עוזרת/שמרטף', 'תיקוני רכב', 'בריאות', 'בעלי חיים',
    'דמי כיס/ילדים', 'יהדות/חגים', 'שונות', 'ביט ללא מעקב', 'מזומן ללא מעקב'
  ];

  const categoriesList = CATEGORIES.join(', ');

  const prompt = `אתה מומחה בניתוח דוחות הוצאות ישראליים.

להלן טקסט מדוח הוצאות:
---
${text}
---

המשימה: מצא את כל ההוצאות/עסקאות וקטלג כל אחת לקטגוריה המתאימה.

קטגוריות ודוגמאות:
- מזון לבית: רמי לוי, שופרסל, מגה, ויקטורי, יוחננוף, סופרים, מכולות
- אוכל בחוץ ובילויים: מסעדות, קפה, פיצריות, סושי, שווארמה, מקדונלדס, WOLT, תן ביס, קולנוע, הופעות
- פארם: סופר פארם, בי פארם, בתי מרקחת
- דלק וחניה: סונול, פז, דור אלון, תחנות דלק, חניונים, פנגו
- מתנות לאירועים ולשמחות: מתנות, פרחים, חתונות, בר מצווה
- ביגוד והנעלה: H&M, זארה, קסטרו, פוקס, חנויות בגדים ונעליים
- תחב"צ: רכבת, אוטובוס, LIME, DOTT, קורקינטים, מוניות, גט
- כבישי אגרה: כביש 6, מנהרות הכרמל
- תספורת וקוסמטיקה: מספרות, סלוני יופי, קוסמטיקה
- תחביבים: חוגים, ספורט, חדר כושר, נטפליקס, ספוטיפיי, GOOGLE, אפליקציות
- סיגריות: סיגריות, טבק, וייפ
- חופשה/טיול: מלונות, צימרים, טיסות, Airbnb, Booking
- עוזרת/שמרטף: עוזרת בית, בייביסיטר
- תיקוני רכב: מוסכים, טיפולי רכב, צמיגים
- בריאות: רופאים, קופות חולים, בדיקות, משקפיים, רופא שיניים
- בעלי חיים: חנויות חיות, וטרינר, מזון לחיות
- דמי כיס/ילדים: צעצועים, גנים, צהרונים, קייטנות
- יהדות/חגים: יודאיקה, פרחים לשבת, חגים
- שונות: כל מה שלא מתאים לקטגוריות אחרות
- ביט ללא מעקב: העברות BIT, פייבוקס
- מזומן ללא מעקב: משיכות כספומט, ATM

לכל הוצאה החזר:
- description: שם בית העסק כפי שמופיע
- amount: הסכום (מספר חיובי בלבד)
- category: קטגוריה מהרשימה למעלה

פורמט תשובה - JSON בלבד:
{"expenses": [{"description": "שם", "amount": 123.45, "category": "קטגוריה"}, ...]}

חוקים חשובים:
- רק הוצאות אמיתיות מהטקסט
- התעלם מכותרות וסיכומים
- סכום חייב להיות מספר חיובי`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'OpenAI API error' 
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Invalid AI response' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

