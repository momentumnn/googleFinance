/**
 * Automatically parses PayLah emails and adds them to the sheet.
 */

class PaymentCompany {
  constructor(name, fromEmail, subject, amountMatch, vendorMatch) {
    this.name = name;
    this.fromEmail = fromEmail;
    this.subject = subject;
    this.amountMatch = amountMatch;
    this.vendorMatch = vendorMatch;
  }

  generateValues(msg) {
    const body = msg.getPlainBody();

    try {
    // 2. Extract Data using Regex
      const dateMatch = msg.getDate();
      const amountMatch = body.match(this.amountMatch);
      const vendorMatch = body.match(this.vendorMatch);
      // Logger.log("Body: " + body + "\n");

      if (dateMatch && amountMatch && vendorMatch) {
        const amount = amountMatch[1];
        const vendor = vendorMatch[1].trim();
        
        // 3. Simple Categorization Logic
        let category = getCategory(vendor);
        if (this.name =="Grab Restaurant") {
          category = "Dining"
        }
        const formattedDate = Utilities.formatDate(dateMatch, TIMEZONE, "dd-MMM-yyyy");

        // 4. Append to Sheet
        // sheet.appendRow([formattedDate, "PayLah", vendor, category, "$" + amount]);
        return [formattedDate, this.name, vendor, category, amount];
        
        // 5. Mark as read so it's not processed again
        // msg.markRead();
      }
      else {
        // Logger.log("Body: " + body + "\n"); 
        Logger.log("Date match: " + dateMatch+ "\n");
        Logger.log("Amount match: " + amountMatch+ "\n");
        Logger.log("Vendor match: " + vendorMatch + "\n");
        Logger.log(dateMatch && amountMatch && vendorMatch);

      }
    } catch (e) {
      Logger.log("Error parsing message: " + e.message);
    }

  }

}

const PAYLAH_SUBJECT = "Transaction Alerts"
const DBS_RCV_SUBJECT = "digibank Alerts - You've received a transfer"
const DBS_PAY_SUBJECT = "iBanking Alerts"
const SHOPBACK_SUBJECT = "Your ShopBack Pay receipt "
const GRAB_SUBJECT = "Your Grab E-Receipt"

const PAYLAH_EMAIL = "paylah.alert@dbs.com"
const DBS_EMAIL = "ibanking.alert@dbs.com"
const SHOPBACK_EMAIL = "hello@info.shopback.sg"
const GRAB_EMAIL = "no-reply@grab.com "

const TIMEZONE = Session.getScriptTimeZone();
const paylah = new PaymentCompany("Paylah", PAYLAH_EMAIL, PAYLAH_SUBJECT, /Amount: SGD([\d.]+)/, /To: (.*)/);
const rcvDbsIbanking = new PaymentCompany("DBS In", DBS_EMAIL, DBS_RCV_SUBJECT, /received SGD ([\d.]+)/, /\* From:\*[\s\u200c]+(.*)\n/);
const payDbsIbanking = new PaymentCompany("DBS Out", DBS_EMAIL, DBS_PAY_SUBJECT, /Amount:\s*SGD\s*([\d,.]+)/, /To:\s*(.*)/);
const shopback = new PaymentCompany("Shopback", SHOPBACK_EMAIL, SHOPBACK_SUBJECT, /Total\s+paid\s+\$([\d.]+)/, /Payment\s+made\s+at:\s*\n\s*(.*)/ );
const grabRestaurant = new PaymentCompany("Grab Restaurant", GRAB_EMAIL, GRAB_SUBJECT, /TOTAL\s+SGD\s*([\d.]+)/, /Restaurant:\s*([\s\S]*?)\n/);

function constant() {
  trackExpenses(grabRestaurant);
}

function test(){
  trackExpenses(payDbsIbanking);
  trackExpenses(paylah);
  trackExpenses(rcvDbsIbanking);
  trackExpenses(shopback);

}

function trackExpenses(exp) {
  Logger.log("tracking " + exp.name);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  
  // 1. Search for unread PayLah emails (adjust the search query as needed)
  const query = 'subject:' + exp.subject + " from:" + exp.fromEmail + " is:unread";
  // const query = 'subject:' + exp.subject + " from:" + exp.fromEmail;
  const threads = GmailApp.search(query);
  
  if (threads.length === 0) {
    Logger.log("No new emails found.");
    return;
  }

  const currentYear = new Date().getFullYear();
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      const savedValues = exp.generateValues(msg);
      if (savedValues != null) {
        sheet.appendRow(savedValues);
        msg.markRead();
      }
      Logger.log(savedValues);
    });
  });
}



/**
 * Helper to map vendors to categories
 */
function getCategory(vendor) {
  const v = vendor.toUpperCase();
  if (v.includes("TEA") || v.includes("CAFE") || v.includes("FOOD") || v.includes("KOPITIAM")) return "Dining";
  if (v.includes("GRAB") || v.includes("GOJEK") || v.includes("SMRT") || v.includes("TRANSIT")) return "Transport";
  if (v.includes("NTUC") || v.includes("COLD STORAGE") || v.includes("SHENGSIONG")) return "Groceries";
  if (v.includes("7-ELEVEN") || v.includes("CHEERS")) return "Convenience";
  
  return "General"; // Default
}