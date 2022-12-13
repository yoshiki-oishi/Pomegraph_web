import { Tree } from "./TreeImport";

const tsv_to_array = (data, delimiter = '\t', omitFirstRow = false) =>
    data
        .slice(omitFirstRow ? data.indexOf('\n') + 1 : 0)
        .split('\n')
        .map(v => v.split(delimiter));

export class Identical extends Tree{

    #identical;

    constructor(f){
        super(f);
        this.#identical = [];
    }

    get identical(){
        return this.#identical;
    }

    set identical(i){
        this.#identical = i;
    }

    getIdentical(id){
        return;
    }

    loadIdentical(text){
        let ident = [];  
        let strains =[];
        let cur_id;
        let iserr = false;

        // scan lines. skip first column.
        let df = tsv_to_array(text.replaceAll(/\r/g,''),'\t',true);

        if(!df.length) console.log("Scan failed: Identical Seq");
        df.forEach(v => {
//        for (let i in df){
            // let [node, strain, dummy] = df[i];
            let [node, strain, dummy] = v;
            if(dummy){
                iserr = true; // flag toggled.
            };
            //if(i==0){ cur_id = node; }  
            if(node){ // if heading node label exists (after second occurance)
                if(cur_id){
                    ident.push({node:cur_id, strains:strains});
                    strains =[];
                }
                cur_id = node;
            }
            if(strain) strains.push(strain);
        })
        // push last element.
        if (cur_id) ident.push({node:cur_id, strains:strains});
        if(iserr){
            console.log("Scan failed: Identical Seq");
            ident = []; // reset Dictionary.       
        }
        // console.table(ident);
        return ident;
    }

    toJSON(){
        let result = {};
        this.ident_df = [];
        result['identical'] = this.data;
        return result;        
    }

    Reader(onload){
        this._Reader(onload, this.loadIdentical);
    }
}