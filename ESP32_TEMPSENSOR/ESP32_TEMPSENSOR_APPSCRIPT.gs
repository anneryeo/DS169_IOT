function doPost(e) {
    
 var sheet = SpreadsheetApp.getActiveSheet();
 var data = JSON.parse(e.postData.contents);

 sheet.appendRow([
   data.timestamp,
   data.temperature,
   data.humidity
 ]);

 return ContentService.createTextOutput("Success");

}