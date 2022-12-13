import {ExcelJs} from "../base/ExcelImport.js";
import { Identical } from "../base/IdentImport.js";
import {Nexus, NexusImporter} from "../base/NexusImport";
import { Tree } from "../base/TreeImport.js";

export class myFileReader {

    constructor(){
        const $excel=document.getElementById('excel_file'); // file input.
        // const $tree=document.getElementById('tree_file'); // file input.
        const $nexus= document.getElementById('nexus_file'); // file input.
        const $ident = document.getElementById('Identical_file'); // file input.
        const $loading=document.getElementById('loading'); // loading spinner.

        $excel.addEventListener('change',(evt) => {
            const files = evt.target.files;
            const f = files[0];  // branch by mimetype or file name.
            const graph = JSON.parse(localStorage.getItem('graph'));
            var er = new ExcelJs(f);
            er.Reader(() => {
                const json = er.toJson();
                // join operation
                if(graph && Object.keys(graph.epi).length !== 0){
                    let comb_df = json.nodes.map(
                        anObj1 => ({
                            ...graph.epi.find(
                                anObj2 => anObj1["SEQID"] === anObj2["SEQID"]
                            ), ...anObj1
                        })
                    );
                    json.nodes = comb_df; // leave stored gnodes.
                    json.gnlist = graph.gnlist;
                    json.epi = graph.epi;
                    json.gelist = graph.gelist;
                }else{
                    json.epi = [];
                    json.gnlist = [];
                    json.gelist = [];
                }
                localStorage.setItem('graph', JSON.stringify(json));
                localStorage.setItem('update', true);
            });
            $excel.blur(); // Release focus from file selection
        });

        let $nexArea = document.getElementById('nexusSelect');
        let $seqArea = document.getElementById('sreqArea');

        $nexus.addEventListener('change',(evt) => {
            const files = evt.target.files;
            const f = files[0];  // branch by mimetype or file name.
            let er = new Nexus(f);
            er.Reader(() =>{
                const json = er.toJSON();
                localStorage.setItem('nexus', JSON.stringify(json));
                if(localStorage.getItem('identical')){
                    myFileReader.joinGenomeEpi();
                }
            });
            if(!$seqArea.hasAttribute('class'))
                $seqArea.setAttribute('class','isFileRead');

            // if(!localStorage.getItem('identical')){
            //     myFileReader.joinGenomeEpi();
            // }
            $nexus.blur(); // Release focus from file selection
        });

        $ident.addEventListener('change',(evt) => {
            const files = evt.target.files;
            const f = files[0];  // branch by mimetype or file name.
            let er = new Identical(f);
            er.Reader(() =>{
                const json = er.toJSON();
                localStorage.setItem('identical', JSON.stringify(json));
                if(localStorage.getItem('nexus')){
                    myFileReader.joinGenomeEpi();
                }
            });

            $ident.blur(); // Release focus from file selection
        });
    }
    
    static makeFileList(){
        let fileListURL = 'dist/data/json/fileList.json';
        fetch(fileListURL).
            then(response =>{
                const res2 = response.clone();
                if (res2.ok){
                    return res2.json();
                }
            }).then(json=>{
                let src = "";
                let fileNameList = json.fileList;
                src = '<select class="pure-button">';
                src += '<option value="default">Select strain...</option>'
                // console.log(fileNameList);
                fileNameList.forEach(o =>{
                    src+= `<option value="/data/json/${o.file}">${o.name}</option>`
                })
                src += '</select>';
                
                let $fileNameList = document.getElementById('fileNameList');
                // console.log(src);
                $fileNameList.innerHTML = src;
            });

            let VirusType = "";
            let select = document.getElementById('fileNameList');
            select.addEventListener('change', ()=>{
                let selected = select.getElementsByTagName('option');
                for(let type of selected){
                    if(type.selected)
                    {
                        VirusType = type.value;
                        break;
                    }
                }
                this.loadSampleJSON(VirusType);
                if(!!document.querySelector('option[value=default]')){
                    document.querySelector('option[value=default]').remove();
                }
            });
    }

    static joinGenomeEpi(){
        const graph = JSON.parse(localStorage.getItem('graph'));
        let json_in = {};
        json_in.nexus = JSON.parse(localStorage.getItem('nexus'));
        json_in.ident = JSON.parse(localStorage.getItem('identical'));
        if(!json_in.nexus || !json_in.ident) return;
        let nexus = new NexusImporter(json_in);
        const json = nexus.toJSON();
        // join operation
        if(graph && Object.keys(graph.edges).length !== 0 ){
            let comb_df = graph.nodes.map(
                anObj1 => ({
                    //...json.epi.find(
                    ...json.epi.find(
                        anObj2 => anObj1["SEQID"] === anObj2["SEQID"]
                    ), ...anObj1
                })
            );
            json.nodes = comb_df;
            json.edges = graph.edges;
        }else{
            // node names are overriden when only tree data.
            json.edges = [];
        }
        // json.tree = graph.tree;
        // json.epi = graph.epi;
        // json.dist = graph.dist;
        localStorage.removeItem('nexus');
        localStorage.removeItem('identical');
        localStorage.setItem('graph', JSON.stringify(json));
        localStorage.setItem('update', true);
    }

    static loadSampleJSON(jsonPath){
        // console.log(jsonPath);
        this.url = jsonPath;
       
        fetch(this.url)
            .then(response => {
                if (response.ok){
                    return response.json();
                }
                throw new Error("Could not load data from " + this.url);                
            })
            .then(json =>{
                localStorage.setItem('graph',JSON.stringify(json));
                localStorage.setItem('update', true);
                return this;
            })
    }
}