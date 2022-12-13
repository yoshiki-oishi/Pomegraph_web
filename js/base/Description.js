export function InsertDescription(){
    let setStr = ""
    let $nodeInfo = document.getElementById('nodeInfoDescription');
    setStr = 'Detailed information about a selected tag in main window'
    $nodeInfo.setAttribute('data-tooltip', setStr);

    let $nodeList = document.getElementById('nodeListDescription');
    setStr = 'Select tag name in the below box to fill in the search box. blue: absent in Base Epi-Group View, gray: absent in Epi-Genome Composite View';
    $nodeList.setAttribute('data-tooltip', setStr);

    let $nodeSearch = document.getElementById('nodeSearchDescription');
    setStr = 'Searches for tags in the main window. Switch matching method by selecting radio buttons below.';
    $nodeSearch.setAttribute('data-tooltip', setStr);

    let $switch = document.getElementById('swtichDescription');
    setStr = 'Switch to display the grid in Base Epi-Group View.';
    $switch.setAttribute('data-tooltip', setStr);

    let $expand = document.getElementById('expandDescription');
    setStr = 'Launch fullscreen view in new window.';
    $expand.setAttribute('data-tooltip', setStr);

    /*let $lensD = document.getElementById('LensDescription');
    setStr = 'show Lens Description';
    $lensD.setAttribute('data-tooltip', setStr);*/

    let $graphControl = document.getElementById('graphControl');
    setStr = 'Change tag shape size in the main window.';
    $graphControl.setAttribute('data-tooltip', setStr);

    let $fontScale = document.getElementById('fontScale');
    setStr = 'Change tag font size in the main window.';
    $fontScale.setAttribute('data-tooltip', setStr);

    let $ExcelD = document.getElementById('ExcelSelect');
    setStr = 'Choose local Excel file';
    $ExcelD.setAttribute('data-tooltip', setStr);

    let $NexusD = document.getElementById('nexusSelect');
    setStr = 'Choose local Nexus formatted file';
    $NexusD.setAttribute('data-tooltip', setStr);

    let $IdenticalD = document.getElementById('Identical');
    setStr = 'Choose local Identical formatted file';
    $IdenticalD.setAttribute('data-tooltip', setStr);

    let $basegraphDescription = document.getElementById('basegrahDescription');
    setStr = 'Display Basegraph(Epidemiology View)';
    $basegraphDescription.setAttribute('data-tooltip', setStr);

    let $pomegrahDescription = document.getElementById('pomegrahDescription');
    setStr = 'Display Basegraph(Genome View)';
    $pomegrahDescription.setAttribute('data-tooltip', setStr);

    let $crosshairsDescription = document.getElementById('crosshairsDescription');
    setStr = 'Reset the display position of the graph.';
    $crosshairsDescription.setAttribute('data-tooltip', setStr);

    let $zoominDescription = document.getElementById('zoominDescription');
    setStr = 'Zoom in on the graph display.';
    $zoominDescription.setAttribute('data-tooltip', setStr);

    let $zoomoutDescription = document.getElementById('zoomoutDescription');
    setStr = 'Zoom out on the graph display.';
    $zoomoutDescription.setAttribute('data-tooltip', setStr);
}
