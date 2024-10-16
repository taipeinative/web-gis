/**
 * The class for signal phasing states. 
 */
class State {

    /**
     * @type {object} The seconds left until turning into the green light for each signal.
     * @property {number} ew - The counter of east-west bound signal.
     * @property {number} ns - The counter of north-south bound signal.
     */
    countdown = {
        ew: 0,
        ns: 0
    };

    /**
     * @type {number} The current phase's index in the phase list.
     */
    current = 0;

    /**
     * @type {Array<number>} The duration settings for: each phase, each protected left turn.
     */
    duration = [10, 5];

    /**
     * @type {boolean} Whether the `State` object is initialized or not.
     */
    initialize = false;
    
    /**
     * @type {Array<number>} The duration settings in the last run.
     */
    lastDuration = [10, 5];

    /**
     * @type {number} How many seconds until the phase ends.
     */
    phaseEnd = 10;

    /**
     * @type {number} The duration of intersection clearance, when all signals are red.
     */
    static clearDuration = 2;

    /**
     * @type {number} The duration of yellow signal, which indicates the signal is about to turn into red.
     */
    static yellowDuration = 2;

    /**
     * Get the current red light length in seconds.
     * @returns {number} The duration of the red light.
     */
    redDuration() {
        return (
            this.duration[0] +      // Green light
            State.yellowDuration +  // Yellow light
            this.duration[1] +      // Protected left turn
            State.clearDuration     // Signal clearance interval
        );
    }
}

/**
 * The template for tiles.
 */
class Tile {

    /**
     * The tile template with crossroad pieces.
     * @returns {string} The tile with crossroads.
     */
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
 * @type {State} The current state (or the last phase if the simulation is interuptted) of the signal phases.
 */
let currentState = new State();

/**
 * @type {number} The manager that holds the intevalID.
 */
let intervalManager;

/**
 * Parse the countdown value into strings.
 * @param {number} v - The inputted value.
 * @returns {string} Parsed string.
 */
const parseCountdown = (v) => {
    if (v > 99) {
        return '--';
    } else if (v > 0) {
        return `${v}`;
    } else {
        return '';
    }
}

/**
 * Reset the state and values.
 */
const resetState = () => {
    currentState = new State();

    $('#duration').val('10');
    $('#duration').removeAttr('disabled');
    $('#leftTurn').val('5');
    $('#leftTurn').removeAttr('disabled');
    $('#start').removeAttr('disabled');
    $('#stop').attr('disabled', true);

    turnSignal('east', 3);
    turnSignal('north', 0);
    turnSignal('south', 0);
    turnSignal('west', 3);
    $('#east .counter').text(parseCountdown(currentState.countdown.ew));
    $('#north .counter').text(parseCountdown(currentState.countdown.ns));
    $('#south .counter').text(parseCountdown(currentState.countdown.ns));
    $('#west .counter').text(parseCountdown(currentState.countdown.ew));
}

/**
 * Resume the simulation.
 */
const resumePhase = () => {
    
    /**
     * @type {boolean} The flag indicating whether the html (except for the countdown) should be updated.
     */
    let htmlChange = true;
    
    /**
     * @type {Array<number>} The current phase durations.
     */
    const intervals = [
        currentState.duration[0],   // 0, 'N-S (green)'
        State.yellowDuration,       // 1, 'N-S (yellow)'
        currentState.duration[1],   // 2, 'N-S (left turn)'
        State.clearDuration,        // 3, 'Signal clearance interval'
        currentState.duration[0],   // 4, 'E-W (green)'
        State.yellowDuration,       // 5, 'E-W (yellow)'
        currentState.duration[1],   // 6, 'E-W (left turn)'
        State.clearDuration         // 7, 'Signal clearance interval'
    ];

    /**
     * Update the HTML signal.
     */
    const updateSignal = () => {
        
        // Update the counter value.
        $('#east .counter').text(parseCountdown(currentState.countdown.ew));
        $('#north .counter').text(parseCountdown(currentState.countdown.ns));
        $('#south .counter').text(parseCountdown(currentState.countdown.ns));
        $('#west .counter').text(parseCountdown(currentState.countdown.ew));
        
        // If the flag raised, go update the signal lights.
        if (htmlChange) {
            switch (currentState.current) {
                case 0:
                case 1:
                case 2:
                    turnSignal('north', currentState.current);
                    turnSignal('south', currentState.current);
                    break;
    
                case 4:
                case 5:
                case 6:
                    turnSignal('east', currentState.current - 4);
                    turnSignal('west', currentState.current - 4);
                    break;
    
                case 3:
                case 7:
                    turnSignal('east', 3);
                    turnSignal('north', 3);
                    turnSignal('south', 3);
                    turnSignal('west', 3);
                    break;
            }

            // Show current phase in the Phase List.
            $('.phase-list li').eq(currentState.current).addClass('current');
            $('.phase-list li').not(`:nth(${currentState.current})`).removeClass('current');
            
            // Turn off the flag until it is raised again.
            htmlChange = false;
        }
    }

    /**
     * Update the state of currentState and manipulate HTML contents. 
     */
    const updateState = () => {

        // One second had elapsed.
        currentState.phaseEnd -= 1;

        // Update the countdown as well.
        Object.entries(currentState.countdown).map(v => {
            currentState.countdown[v[0]] -= 1;
        });

        // In case of altering durations during pause, the current values have to be added/subtracted with the difference.
        if (currentState.lastDuration != currentState.duration) {

            const durationDifference = currentState.lastDuration.map((v, i) => {
                return currentState.duration[i] - v;
            });

            switch (currentState.current) {
                case 0:
                    currentState.countdown.ew += (durationDifference[0] + durationDifference[1]);
                    currentState.phaseEnd += durationDifference[0];
                    break;

                case 1:
                    currentState.countdown.ew += durationDifference[1];
                    break;

                case 2:
                    currentState.countdown.ew += durationDifference[1];
                    currentState.countdown.ns += (durationDifference[0] + durationDifference[1]);
                    currentState.phaseEnd += durationDifference[1];
                    break;

                case 3:
                    currentState.countdown.ns += (durationDifference[0] + durationDifference[1]);
                    break;

                case 4:
                    currentState.countdown.ns += (durationDifference[0] + durationDifference[1]);
                    currentState.phaseEnd += durationDifference[0];
                    break;

                case 5:
                    currentState.countdown.ns += durationDifference[1];
                    break;

                case 6:
                    currentState.countdown.ew += (durationDifference[0] + durationDifference[1]);
                    currentState.countdown.ns += durationDifference[1];
                    currentState.phaseEnd += durationDifference[1];
                    break;

                case 7:
                    currentState.countdown.ew += (durationDifference[0] + durationDifference[1]);
                    break;
            }

            currentState.lastDuration = [...currentState.duration]; // Deep copy the initial duration
        }

        // If phaseEnd is equivalent to 0, the next phase should be initiated.
        if (currentState.phaseEnd <= 0) {
            currentState.current = (currentState.current + 1) % 8;
            currentState.phaseEnd = intervals[currentState.current];
            htmlChange = true;

            // Reset the countdown when the it reaches phase 2 or phase 6, when the red light presents.
            if (currentState.current == 2) {
                currentState.countdown.ns = currentState.redDuration() + currentState.duration[1] + State.clearDuration;
            } else if (currentState.current == 6) {
                currentState.countdown.ew = currentState.redDuration() + currentState.duration[1] + State.clearDuration;
            }
        }

        // Update the visual parts.
        updateSignal();
    }
    
    intervalManager = setInterval(updateState, 1000);
}

/**
 * Start the simulation.
 */
const startPhase = () => {

    /**
     * @type {Array<string>} The unvalidated, user-inputted durations. 
     */
    const inputDuration = [$('#duration').val(), $('#leftTurn').val()];

    // Update the new duration values.
    inputDuration.forEach((v, i) => {
        currentState.duration[i] = v != '' ? parseInt(v) : (i == 0 ? 10 : 5);
    });

    // If the currentState is empty, assign each signal's phase to it.
    if (!currentState.initialize) {
        const initRedDuration = currentState.redDuration();
        currentState.countdown.ew = initRedDuration;
        currentState.initialize = true;
        currentState.lastDuration = [...currentState.duration]; // Deep copy the initial duration
        currentState.phaseEnd = currentState.duration[0];
        turnSignal('east', 3);
        turnSignal('north', 0);
        turnSignal('south', 0);
        turnSignal('west', 3);
        $('#east .counter').text(parseCountdown(currentState.countdown.ew));
        $('#north .counter').text(parseCountdown(currentState.countdown.ns));
        $('#south .counter').text(parseCountdown(currentState.countdown.ns));
        $('#west .counter').text(parseCountdown(currentState.countdown.ew));
    }

    resumePhase();
}

/**
 * Toggle the state of start/stop buttons.
 */
const toggleState = () => {
    $('#duration').prop('disabled', (i, v) => !v);
    $('#leftTurn').prop('disabled', (i, v) => !v);
    $('#start').prop('disabled', (i, v) => !v);
    $('#stop').prop('disabled', (i, v) => !v);
}

/**
 * Turn the designated signal to corresponding lights.
 * @param {string} id - The id of the signal.
 * @param {number} [state] - The status code. 0 = Green, 1 = Yellow, 2 = Red with left turn, and 3 = Red.
 */
const turnSignal = (id, state = 0) => {
    switch (state % 4) {
        case 0:
            $(`#${id} .red-bulb`).removeClass('active');
            $(`#${id} .yellow-bulb`).removeClass('active');
            $(`#${id} .green-bulb`).addClass('active');
            $(`#${id} .arrow`).addClass('hidden');
            break;

        case 1:
            $(`#${id} .red-bulb`).removeClass('active');
            $(`#${id} .yellow-bulb`).addClass('active');
            $(`#${id} .green-bulb`).removeClass('active');
            $(`#${id} .arrow`).addClass('hidden');
            break;

        case 2:
            $(`#${id} .red-bulb`).addClass('active');
            $(`#${id} .yellow-bulb`).removeClass('active');
            $(`#${id} .green-bulb`).removeClass('active');
            $(`#${id} .arrow`).removeClass('hidden');
            break;

        case 3:
            $(`#${id} .red-bulb`).addClass('active');
            $(`#${id} .yellow-bulb`).removeClass('active');
            $(`#${id} .green-bulb`).removeClass('active');
            $(`#${id} .arrow`).addClass('hidden');
            break;
    }
}

/**
 * Validate the user input to make sure the wrong input will not be sent back.
 * @param {jQuery.fn.init} textField - The input field element. 
 */
const validateDuration = (textField) => {

    // Assign an event listener to monitor the changes of the input field.
    // Use `.first()` to ensure that there is no second instance.
    textField.first().on('blur', () => {

        /**
         * @type {string} The validated and filtered input.
         */
        const validated = textField.val().replace(/[^\d]/g, '') // Removes any non-digits
                                         .replace(/^0+/g, '');  // Removes leading 0s
              
        // Send the warning message
        if (textField.val() != validated) {
            console.warn(`Invalid input in #${textField.attr('id')}; user inputted '${textField.val()}', but the valid value is '${validated}'`);
            textField.val(validated);
        }
    });
}

// Shorhand function for $(document).ready();
$(() => {
    
    // The matrix storing all tile templates.
    let tileArray = [
        Tile.emp(), Tile.ver(Tile.sig('south', 'S. Bound')), Tile.emp(),
        Tile.hor(Tile.sig('east', 'E. B.')), Tile.cro(), Tile.hor(Tile.sig('west', 'W. B.')),
        Tile.emp(), Tile.ver(Tile.sig('north', 'N. Bound')), Tile.emp()
    ];

    // Add all tiles.
    for (const tile of tileArray) {
        $('.canvas').append(tile);
    }

    // Add event listeners
    validateDuration($('#duration'));
    validateDuration($('#leftTurn'));
    $('#reset').on('click', () => {
        resetState();
        clearInterval(intervalManager);
    });
    $('#start').on('click', () => {
        toggleState();
        startPhase();
    });
    $('#stop').on('click', () => {
        toggleState();
        clearInterval(intervalManager);
    });
});