/**
 * The template for tiles.
 */
class Tile {

    static cro = () => `
        <div class="cro">
            <div class="road"></div>
            <div class="road"></div>
            <div class="road"></div>
        </div>
    `;
    
    /**
     * The template of place-holder tiles.
     * @returns {string} The empty <div> element.
     */
    static emp = () => `<div></div>`;
    
    /**
     * The tile template with horizontal road pieces.
     * @param {string} content - The content inside of the tile.
     * @returns {string} The tile with horizontal road pieces.
     */
    static hor = (content) => `
        <div class="hor">
            <div class="road">
                ${content}
            </div>
        </div>
    `;
    
    /**
     * The template of traffic signals.
     * @param {*} id - The ID of the signal.
     * @param {*} label - The label of the signal.
     * @returns The traffic signal.
     */
    static sig = (id, label) => `
        <div id="${id}" class="sig">
            <div class="machine">
                <div class="module">
                    <div class="counter">--</div>
                </div>
                <div class="module">
                    <div class="red-bulb active"></div>
                </div>
                <div class="module">
                    <div class="yellow-bulb"></div>
                </div>
                <div class="module">
                    <div class="green-bulb"><span class="arrow hidden">🡰</span></div>
                </div>
            </div>
            <h4>${label}</h4>
        </div>
    `;

    /**
     * The tile template with vertical road pieces.
     * @param {string} content - The content inside of the tile.
     * @returns {string} The tile with horizontal road pieces.
     */
    static ver = (content) => `
        <div class="ver">
            <div class="road">
                ${content}
            </div>
        </div>
    `;
}

/**
 * Reset the state and values.
 */
const resetState = () => {
    $('#duration').val('10');
    $('#duration').removeAttr('disabled');
    $('#leftTurn').val('5');
    $('#leftTurn').removeAttr('disabled');
    $('#start').removeAttr('disabled');
    $('#stop').attr('disabled', true);
}

/**
 * Toggle the state of start/stop buttons.
 */
const toggleState = () => {
    $('#duration').prop('disabled', (k, v) => !v);
    $('#leftTurn').prop('disabled', (k, v) => !v);
    $('#start').prop('disabled', (k, v) => !v);
    $('#stop').prop('disabled', (k, v) => !v);
}

// Shorhand function for $(document).ready();
$(() => {
    
    // The matrix storing all tile templates.
    let tileArray = [
        Tile.emp(), Tile.ver(Tile.sig('south', 'S')), Tile.emp(),
        Tile.hor(Tile.sig('east', 'E')), Tile.cro(), Tile.hor(Tile.sig('west', 'W')),
        Tile.emp(), Tile.ver(Tile.sig('north', 'N')), Tile.emp()
    ];

    // Add all tiles.
    for (const tile of tileArray) {
        $('.canvas').append(tile);
    }

    // Add event listeners
    $('#reset').click(resetState);
    $('#start').click(toggleState);
    $('#stop').click(toggleState);
});