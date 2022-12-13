export const Constants = {

    GNODE_KEY: 'GNODEID',
    GROUP_KEY: 'association',

    ZOOM_WHEEL_FACTOR: 0.7,
    ZOOM_KEY_FACTOR: 0.7,
    MOVE_KEY_FACTOR: 0.25,
    ZOOMOUT_LIMIT: 2000,

    // dot size controls.
    MIN_RADIUS: 25 * window.devicePixelRatio,
    MAX_RADIUS: 40 * window.devicePixelRatio,
    FIX_RADIUS: 25 * window.devicePixelRatio,

    FONT_SIZE: 15, // 15px
    FONT_LINE_HEIGHT: 1.1,

    // edge width controls.
    MIN_WIDTH: 0.2 * window.devicePixelRatio,
    MAX_WIDTH: 4 * window.devicePixelRatio,
    FIX_WIDTH: 1 * window.devicePixelRatio,

    LINE_WIDTH_NODE: 2 * window.devicePixelRatio,
    LINE_WIDTH_THIN: 0.5 * window.devicePixelRatio, //LINE_WIDTH_NODE * const
    LINE_WIDTH_EDGE: 2 * window.devicePixelRatio,
    LINE_WIDTH_GENOME_EDGE: 1 * window.devicePixelRatio,
    LINE_WIDTH_GENOME_NODE: 0.5 * window.devicePixelRatio,

    LINE_WIDTH_GRID: 1,
    LINE_WIDTH_LENS: 1,

    //color controls.
    COLOR_LINE_REGULAR: 'rgb(112, 112, 112)',
    COLOR_BLANK: 'rgb(250, 250, 250)',
    COLOR_MONOCHROME: 'rgb(190, 190, 190)',
    COLOR_DOT_HORIZONTAL: 'rgb(112, 112, 112)',
    COLOR_DOT_TEXT: 'rgb(48, 48, 48)',
    COLOR_LINE_DATE: 'rgb(200, 112, 112)',
    COLOR_LINE_HIGHLIGHT: 'rgb(250,   32,  32)',
    COLOR_LINE_EM: 'rgb(30,30,30)',
    COLOR_LINE_GENOME_EDGE: 'rgb(200, 112, 112)',
    COLOR_LINE_EPIINFO_EDGE: 'rgb(112, 112, 200)',
    COLOR_FILL_GROUP: 'rgb(240, 240, 255)',

    COLRO_LINE_HIGHLIGHT_16 : '#fa2020',

    // Parameters for TimeGrid.
    LAYOUT_EXTENT: 15,
    HORIZONTAL_MAGNITUDE: 8.0,
    ELEVATION_MAGNITUDE: 5.0, // 8.0

    //Parameters for PomLayout.
    GNODE_SIZE_MAG: 20.0, // 25.0
    DRAW_SWICTH_LIMIT: 140, // 90
    BDR_BASE_RADIUS: 1.0, // 0.9
    STACK_DOT_RADIUS: 0.25,
    BRANK_NODE_RADIUS: 0.1,
    BDR_BLANKDOT_RADIUS: 0.01, // Radii of empty gnodes.
    POM_LOCAL_MAGNITUDE: 1.0, // Magnitude for tag positions.
    GNODE_BRANCH_MAG: 2.0, // 4.0
    RADIAL_TICK_UNIT: 1.0,
    RADIAL_FAN_WIDTH: 0.75 * Math.PI*2,
    RADIAL_FAN_MARGIN: 0.0125 * Math.PI*2, // margin at both sides.

    //Parameters for drawing ticks.
    TICK_HEIGHT: 0.2,
    TICK_WIDTH: 0.2,
    LINE_WIDTH_TICK: 1 * window.devicePixelRatio,

    DRAG_THRESHOLD: 5, // Pixels before drag is triggered

    NUMBER_NODES: 50,
    NUMBER_EDGES: 100,

    GRID_MAX_DAYS:50,

    NODE_SEARCH_MAX:5,

    ZOOM_THRESHOLD_MAX: 4.0,
    ZOOM_THRESHOLD_MIN: 0.75
};
