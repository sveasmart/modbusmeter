var mbus_master = require("node-modbus");
const { try } = require("bluebird");

/*
 * We will most likely have to make use of a local hardcoded lookuptable/database
 * 	for the different types of devices (power meter, tmp/hum sens., leakage detect., smoke/fire alarm.).
 * 	
 * Might look a little something like this:
 * 	
 *
 * 	const devices = {
 *		power_meter: {
 *			register_init: 10, // The register value where we store the first power_meter
 *			register_offset: 260, //How much to add to register_init in order to read from the next power_meter
 *			multiply_val_by: 1 // what we need to multiply the stored register value with in order to get the correct unit (Wh)
 *		},
 *		tmphum_sens: {
 *			register_init: 20, // The register value where we store the first tmphum_sens
 *			register_offset: 170 // How much to add to register_init in order to read from the next tmphum_sens
 *			multiply_val_by: 100 // (if I remember correctly) the tmhum_sens register value is 1*10^-2 smaller than it should.
 *					     // so multiply by 100 to get correct celcius and RH.
 *		},
 *		leakage_detect: {
 *			register_init: 30, // --------------------------||--------------------------
 *			register_offset: 100, //  --------------------------||--------------------------
 *			multiply_val_by: 1
 *		}
 *		smk_alrm: {
 *			register_init: 60,
 *			register_offset: 90,
 *			multiply_val_by: 1
 *		}
 * 	}
 *
 *  The below values are for the current test setup @sveasolar.
 *
	Smoke detector on reg 100 
		|-> num_reg_for_dev = 40

	Water leakage on reg 150
		|-> num_reg_for_dev = 30
	
	Room sensor on reg 190
		|-> num_reg_for_dev = 70

*/

const register = 190;
const num_reg_for_dev = 70;
const date = new Date();


/* Scan the wM-Bus devices on the register IDs. */
const client = mbus_master.client.tcp.complete({
	host: "192.168.1.101",
	port: 502,
	unit_id: 1,
	timeout: 2000,
	autoReconnect: true,
	reconnectTimeout: 15000,
	logLabel: "ModbusClientTCP",
	logLevel: "debug",
	logEnabled: false
});


/* Is this necessary? */
client.connect();

/* Identical to function found @ ../src/modbus_client.js */
function read_serial_number(register) {
	client.on("connect", () => {
		console.log(`DEBUG: Reading serial number of wM-Bus register: ${register}`);
		client.readHoldingRegisters(register, 4).then(function(response) {
			console.log(`wM-Bus response payload: `, response.payload);
			const serial_number = response.payload.readUIntBE(0, 4);
			console.log(`Found serial number: [${serial_number}]`);
	}).catch(function (err) {
		console.log(`ERROR: modbus caught an error.`, err);
	}).done(function () {
		console.log(`Modbus done, goodbye.\n`);
		client.close();
	})});
}

/* Currently tries to read both serial number and holdingValues. This might be the origin of the "modbus not in ready state" error. */
function read_val(reg) {
	console.log(`DEBUG: entered read_tmp`);
		const start_t = date.getTime();
		client.on("connect", () => {
				console.log(`DEBUG: Reading values and serial number of wM-Bus register: ${reg}`);
				client.readHoldingRegisters(reg, 10).then(function(response) {
				const dur = date.getTime() - start_t;
				const payload = response.payload;
	
				console.log(`wM-Bus response took: ${dur}ms\n    Response looks like:\n    |-> `, payload);
				const serial_number = payload.readUIntBE(0, 4);
	
				if(serial_number) {
					console.log(`Found serial number: [${serial_number}]`);
				}
	
				/* The load will be a buffer of 8 bytes. (When reading from an electrical meter) */
				const energy_in_local_unit = payload.readIntBE(2, 6);	
				console.log(`Found value: ${energy_in_local_unit}`);
				
				}).catch(function (err) {
					console.log(`ERROR: modbus caught an error.`, err);
				}).done(function() {
					console.log(`Modbus done, goodbye.\n`);
					client.close();
				})		
			
		});
}

/*
 * Read the holdingValues for all registers -> going in intervals of 10.
 * 	|-> Still causes "modbus not in ready state" error after first read. 
 * 	Issue might not lie in time between reading? Or rather something with client.on("connect", () => {...});
 */
async function read_all() {
	console.log(`DEBUG: entering loop.`);
	for(i = 0; i < num_reg_for_dev; i += 10) {
		read_val(register + i);
		console.log(`DEBUG: done reading [${register + i}]\n waiting...`);
		await sleep(5000);
		console.log(`DEBUG: done waiting.`);
	}
};

/*
 * Interal function used to try and read from several registers - but with a timeOut as to not stress the gateway.
 * 	|-> otherwise throws error saying "modbus not in ready state."
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
};

/* 
 * Rewrite read_val/1 to only read value and not serial number aswell. 
 * But calling both read_serial_numer/1 and read_val/1 caused "modbus not in ready state". hmm....
 */
read_all();
