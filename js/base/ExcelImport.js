// The original script from https://qiita.com/tomgoodsun/items/bc5f2db3c28e1a6525d2

import { EpiJson } from "./Graph.js";
import {fromNodetoString} from "../iGraph/PrimitiveDraw.js";
import {GraphicControl} from "../iGraph/GraphicControl.js"

export function ExcelDatetoString(dint){
  const dobj = (dint !== undefined) ? new Date(dint) : new Date(0);
  let s = (dobj !== undefined) ? `${dobj.getFullYear().toString()}/${(dobj.getMonth()+1).toString().padStart(2,'0')}/${(dobj.getDate()).toString().padStart(2,'0')}`.replace(/\n|\r/g, '') : undefined;
  s = s.replace(/\//g, '-')
  return s;
}

export class ExcelJs {

    #file;
    #workbook;

    static #excelReadCompleted = false;

    constructor(_file){
        this.#file = _file;
    };

    get file(){
        return this.#file;
    }

    get workbook(){
        return this.#workbook;
    }

    static getExcelReadCompleted(){
      return this.#excelReadCompleted;
    }

    static setExcelReadCompleted(excelReadCompleted){
      this.#excelReadCompleted = excelReadCompleted;
    }

    /** Parser functions */
    checkTagId(tagIds){
      let msg = "";
      let importantError = "";
      let trigger = false;
      let str = /[=@:;,%&$#"/¥&]/;
      tagIds.forEach( tagId => {
        if(tagId === undefined){
          //ポップアップ処理をいれる
          importantError += `TAGIDが未設定です. 行 : ${tagIds.indexOf(tagId) + 2 }<br/>`;
          trigger = true;
        }
        else if(tagId.toString().match(str)){
          msg += `TAGIDに禁則文字が使われています. TAGID :${tagId} 行 : ${tagIds.indexOf(tagId) + 2 }<br/>`
        }
        else{
          // Are there duplicate elements in the array
          let firstIndex = tagIds.indexOf(tagId);
          let lastIndex = tagIds.lastIndexOf(tagId);
          if( firstIndex != lastIndex)
          {
            importantError += `TAGIDが重複しています. 行 : ${tagIds.indexOf(tagId) + 2 }<br/>`;
            trigger = true;
          }
          else{
            if(tagId.length < 3 || 64 < tagId.length){
              //Error
              msg += `TAGIDの文字列長は3～64文字です. TAGID :${tagId} 行 : ${tagIds.indexOf(tagId) + 2 }<br/>`;
            }
          }
        }
      });
      if(trigger){
        let modalelemetn = document.getElementById('ExcelFormatCheck-modal-body');
        modalelemetn.innerHTML = importantError;
        let inportErrorModal = new bootstrap.Modal(document.getElementById('ExcelFormatCheck'));
        inportErrorModal.show();
        setTimeout(() => {
          inportErrorModal.hide();
      }, 30000);
      }
      return msg;
    }

    checkDate(dates){
        // min: 1970/01/01 and Future dates should be an error.
        let msg = "";
        let unixMinTime = convertUt2Sn(0);
        let e_time = new Date();
        let time_s = e_time.getTime();
        let unixNowTime = convertUt2Sn(time_s);

        dates.forEach(date => {
          if(isNaN(date)){
            //msg += `Excelのセル書式を「日付」にして入力してください. date :${date} 行 : ${dates.indexOf(date) + 2 }<br/>`;
            // do nothing.
          }else if(  date < Math.floor(unixMinTime) ||  unixNowTime < date){
            msg += `Dateの範囲は1970/1/1 - 現在日時までです. date :${dateFromSn(date)} 行 : ${dates.indexOf(date) + 2 }<br/>`;
          }
        });

        return msg;
    }

    checkAge(ages){
      let msg = "";
      ages.forEach(age => {
        if(age != undefined){
          //Conversion fails when performed on 0.
          //let ageNum = parseInt(age, 10) || -1;
          /*if(isNaN(age)){
            msg += `Ageには半角数字を設定してください. Age :${age} 行 : ${ages.indexOf(age) + 2 }<br/>`;
          }*/
          if(!isNaN(age)){
            let ageNum = age - 0;
            if( ageNum < 0 || 150 < ageNum){
                // Error
                msg += `Ageの数値は0～150です. Age :${age} 行 : ${ages.indexOf(age) + 2 }<br/>`;
            }
          }
        }
      });
      return msg;
    }

    checkSex(sexes){
      let msg = "";
      sexes.forEach(sex => {
        if( sex != undefined){
          if(2 < sex.length){
            msg += `Sexの文字列は最大2文字です. Sex :${sex} 行 : ${sexes.indexOf(sex) + 2 }<br/>`;
          }
        }
      });
      return msg;
    }

    checkCategory(categories){
        let msg = "";
        categories.forEach( category => {
          if(category != undefined){
            if(64 < category.length){
              msg += `Categoryの文字列は最大64文字です. Category :${category} 行 : ${categories.indexOf(category) + 2 }<br/>`;
            }
          }
        });
        return msg;
    }

    // not use.
    checkTitle(titles){
      titles.forEach(title => {
        if(title != undefined){
          if(64 < title.length){
            //Error
          }
        }
      });
      return 0;
    }

    checkAssoc(assocs){
      let msg = "";
      let defined = false;
      assocs.forEach( assoc => {
        if(assoc != undefined){
          defined = true;
          if(64 < assoc.length){
            msg += `Assocの文字列は最大64文字です. Assoc :${assoc} 行 : ${assocs.indexOf(assoc) + 2 }<br/>`;
          }
        }
      });
      if(defined === false)   msg += `Associationの列が入力されていません。`;
      return msg;
    }

    checkIsSymptomatic(IsSymptomatics){
      let msg = "";
      let str =/[YN]/;
      IsSymptomatics.forEach( IsSymptomatic => {
        if(IsSymptomatic != undefined){
          if(1 < IsSymptomatic.length){
            msg += `Emphasizeの文字列長は1文字です. Symptomatic :${IsSymptomatic} 行 : ${IsSymptomatics.indexOf(IsSymptomatic) + 2 }<br/>`;
          }
          else if(!IsSymptomatic.toString().match(str)){
            msg += `EmphasizeにはY/Nを設定してください. Symptomatic :${IsSymptomatic} 行 : ${IsSymptomatics.indexOf(IsSymptomatic) + 2 }<br/>`;
          }
        }
      });
      return msg;
    }

    checkDescription(descriptions){
      let msg = "";
      descriptions.forEach( description => {
        if(description != undefined){
          if(64 < description.length){
            msg += `Descriptionの文字列は最大64文字です. Description :${description} 行 : ${descriptions.indexOf(description) + 2 }<br/>`;
          }
        }
      });
      return msg;
    }

    checkNote(notes){
      let msg = "";
      notes.forEach( note => {
        if(note != undefined){
          if(255 < note.length){
            msg += `Noteの文字列は最大255文字です. Note :${note} 行 : ${notes.indexOf(note) + 2 }<br/>`;
          }
        }
      });
      return msg;
    }

    checkNodeData(nodes_df){

      const getAttrArray = function (attrkey){
        return nodes_df.reduce((ret, elem)=>{
          ret.push(elem[attrkey]);
          return ret;
        }, []);
      }
    
      let msg = "";
      msg += this.checkTagId(getAttrArray("TAGID"));
      msg += this.checkAge(getAttrArray("age"));
      msg += this.checkDate(getAttrArray("date"));
      msg += this.checkSex(getAttrArray("sex"));
      msg += this.checkCategory(getAttrArray("category"));
      msg += this.checkAssoc(getAttrArray("association"));
      msg += this.checkIsSymptomatic(getAttrArray("emphasize"));
      msg += this.checkDescription(getAttrArray("major_note"));
      msg += this.checkNote(getAttrArray("minor_note"));
      //console.log(msg);

      if(msg != ""){

        let erroeMgs = document.getElementById('excelImportErrorToast');
        erroeMgs.innerHTML = msg;

        let $erroWindow = document.getElementById('excelImportErrorArea');
        let $toastArea = document.getElementById('toastWindow');
        $toastArea.style.zIndex = 1000;
        let toast = new bootstrap.Toast($erroWindow, {delay:10000});
        toast.show();
        setTimeout(() => {$toastArea.style.zIndex = -1}, 10000);
      }
      return;
    }

    toJson() {
      //return this.toArray(); // STAB FUNCTION.
      let result = {};
      let comb2_df = {};
      let nodes_df = this.getSheettoArray('SurverySheet');
      let shape_df = this.getSheettoArray('VisualShape');
      let links_df = this.getSheettoArray('PhysicalLink');
      //let edges_df = this.getSheettoArray('GenomeLink');
      let seq_df = this.getSheettoArray('SeqInfo');

      if(!nodes_df || !shape_df || !links_df || !seq_df){
        return false;
      }

      // data format check
      this.checkNodeData(nodes_df);

      // Substitute irreagal date value.
      const pat = new RegExp(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      let new_df = nodes_df.map(
        anObj1 => {
          //anObj1.emphasize = anObj1.highlight; // avid variable name collision.
          if(isNaN(anObj1.date) && anObj1.date.match(pat).length == 3){
            const hits = anObj1.date.match(pat);
            anObj1.date = new Date(hits[0],hits[1],hits[2]);
          }
          anObj1.dint = (isNaN(anObj1.date) || anObj1.date < 25569) ? undefined : Math.round((anObj1.date) - 25569)*86400*1000;
          
          //Blanks except for dates.
          //anObj1.date = isNaN(anObj1.date) ? undefined : anObj1.date;
          anObj1.age = isNaN(anObj1.age) ? "" : anObj1.age;
          anObj1.association = (anObj1.association === undefined) ? 0 : anObj1.association;
//          anObj1.date = (isNaN(anObj1.date) || anObj1.date < 25569) ? undefined : anObj1.date;
          return anObj1;
        }
      );
      // assign link node nunber each link.
      let link2_df = links_df.map(
        Obj1 => {
          Obj1.src = nodes_df.findIndex(Obj2 => Obj1["TAG_from"] === Obj2["TAGID"]);
          Obj1.dst = nodes_df.findIndex(Obj2 => Obj1["TAG_to"] === Obj2["TAGID"]);
          return Obj1;
        }
      );
      // assign shapes to each node.
      let comb_df = new_df.map(
          anObj1 => ({
            ...shape_df.find(anObj2 => anObj1["category"] === anObj2["cat_id"]),
            ...anObj1
          })
        );
      if(seq_df.length){
        comb2_df = comb_df.map(
          anObj1 => ({
            ...seq_df.find(
              anObj2 => anObj1["TAGID"] === anObj2["TAGID"]
            ),
            ...anObj1
          })
        );
      }else{
        comb2_df = comb_df; // omit if sequence data is empty.
      }
      result['nodes']=comb2_df;
      result['edges']=link2_df;

      ExcelJs.setExcelReadCompleted(true);
      return result;
    }

    getSheettoArray(sheetName) {
      let roa = XLSX.utils.sheet_to_row_object_array(this.#workbook.Sheets[sheetName]);
      var sheet = XLSX.utils.sheet_to_json(this.#workbook.Sheets[sheetName], {header: 1});
      // excel format check.
      let ret
      let sheetHeader = sheet[0];
      if(sheetHeader === undefined){
        let modalelemetn = document.getElementById('ExcelFormatCheck-modal-body');
        modalelemetn.innerHTML = 'Excelのフォーマットが正しくありません.';
        let inportErrorModal = new bootstrap.Modal(document.getElementById('ExcelFormatCheck'));
        inportErrorModal.show();
        setTimeout(() => {
          inportErrorModal.hide();
      }, 30000);
        return false;
      }
      if(sheetName == "SurverySheet"){
        const keys = ['TAGID', 'age', 'sex', 'category', 'association', 'emphasize', 'major_note', 'minor_note'];
        ret = this.checkColumn(sheetHeader, keys);
      }
      if(sheetName == "VisualShape"){
        const keys = ['cat_id','type'];
        ret = this.checkColumn(sheetHeader, keys);
      }
      if(sheetName == "PhysicalLink"){
        const keys = ['LINKID', 'TAG_from', 'TAG_to', 'label'];
        ret = this.checkColumn(sheetHeader, keys);
      }
      if(sheetName == "SeqInfo"){
        const keys = ['TAGID', 'SEQID'];
        ret = this.checkColumn(sheetHeader, keys);
      }
      if(ret === false){
        return false;
      }
      if(roa.length > 0){
        return roa;
      }
      return false;
    }

    checkColumn(sheetHeader, keys){
      var keyArray  = {};
      keys.forEach( (n) => {keyArray [n]=true;});
      var result = sheetHeader.filter(n => keyArray [n] == true);
      if(JSON.stringify(keys.sort()) !== JSON.stringify(result.sort())){
        let modalelemetn = document.getElementById('ExcelFormatCheck-modal-body');
        modalelemetn.innerHTML = 'Excelのフォーマットが正しくありません.';
        let inportErrorModal = new bootstrap.Modal(document.getElementById('ExcelFormatCheck'));
        inportErrorModal.show();
        setTimeout(() => {
          inportErrorModal.hide();
      }, 30000);
        return false;
      }
    }

    toCsv() {
        let result = [];
        this.#workbook.SheetNames.forEach(sheetName => {
          let csv = XLSX.utils.sheet_to_csv(this.#workbook.Sheets[sheetName]);
          if(csv.length > 0){
            result.push('SHEET: ' + sheetName);
            result.push('');
            result.push(csv);
          }
        });
        return result.join("\n");
    }

    toFormulae() {
        let result = [];
        this.#workbook.SheetNames.forEach(sheetName => {
          var formulae = XLSX.utils.get_formulae(this.#workbook.Sheets[sheetName]);
          if(formulae.length > 0){
            result.push('SHEET: ' + sheetName);
            result.push('');
            result.push(formulae.join("\n"));
          }
        });
        return result.join("\n");
    }
  
    Reader(onload) {
  
      let reader = new FileReader();
      let that = this;
  
      reader.onload = function(e) {
        let data = e.target.result;
  
        // データが多いとString.fromCharCode()でMaximum call stack size exceededエラーとなるので、
        // 別途関数で処理をする。
        //var arr = String.fromCharCode.apply(null, new Uint8Array(data));
        let arr = handleCodePoints(new Uint8Array(data));
        that.#workbook = XLSX.read(btoa(arr), {type: 'base64'});
        if (typeof onload == 'function') {
          onload(e, that);
        }
      };
      if (this.#file !== undefined){
        reader.readAsArrayBuffer(this.#file);
      }else{
        return;
      }
    } 
};
  
  // see: https://github.com/mathiasbynens/String.fromCodePoint/issues/1
  function handleCodePoints(array) {
    var CHUNK_SIZE = 0x8000; // arbitrary number here, not too small, not too big
    var index = 0;
    var length = array.length;
    var result = '';
    var slice;
    while (index < length) {
      slice = array.slice(index, Math.min(index + CHUNK_SIZE, length)); // `Math.min` is not really necessary here I think
      result += String.fromCharCode.apply(null, slice);
      index += CHUNK_SIZE;
    }
    return result;
  }
    /* Excelのシリアル値とUNIXのエポック秒を相互に変換するための関数群 */
    var COEFFICIENT = 24 * 60 * 60 * 1000; //日数とミリ秒を変換する係数

    var DATES_OFFSET = 70 * 365 + 17 + 1 + 1; //「1900/1/0」～「1970/1/1」 (日数)
    var MILLIS_DIFFERENCE = 9 * 60 * 60 * 1000; //UTCとJSTの時差 (ミリ秒)

    function convertUt2Sn(unixTimeMillis){ // UNIX時間(ミリ秒)→シリアル値
      return (unixTimeMillis + MILLIS_DIFFERENCE) / COEFFICIENT + DATES_OFFSET;
    }
    
    function convertSn2Ut(serialNumber){ // シリアル値→UNIX時間(ミリ秒)
      return (serialNumber - DATES_OFFSET) * COEFFICIENT - MILLIS_DIFFERENCE;
    }
    
    function dateFromSn(serialNumber){ // シリアル値→Date
      let date = new Date(convertSn2Ut(serialNumber));
      let day = date.getDate();
      let year = date.getFullYear();
      let month = date.getMonth() + 1;
      return year + "/" + month + "/" + day;
    }
    
    function dateToSn(date){ // Date→シリアル値
      return convertUt2Sn(date.getTime());
    }
    