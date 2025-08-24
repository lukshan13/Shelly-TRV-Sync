 /**
 * Shelly Script: Mirror Target Temperature Between Two Shelly BLU TRVs
 *
 * This script runs on a Shelly BLU Gateway and listens for target temperature
 * updates from a pair of Shelly BLU TRVs. When one TRV's target temperature changes,
 * the same value is sent to the other TRV to keep them in sync.
 *
 * The script relies on Shelly's behavior of only emitting events when a value changes,
 * which helps avoid sync loops.
 *
 * Important Notice: This script has only been tested with the new, round TRV. It appears shelly has an older BLU trv with a squarish design. Not sure, but just be aware.
 * This script has only been tested with the TRV that's available at this link - https://www.shelly.com/products/shelly-blu-trv-single-pack'
 *
 * TODO:
 * 1. Support syncing more than two TRVs (e.g. syncing all in a group)
 * 2. Allow syncing TRVs across different BLU Gateways via HTTP or MQTT
 * 3. Add a periodic reconciliation check to ensure TRVs remain in sync
 *    (e.g., in case a BLE broadcast was missed)
 */

// Define the two TRV IDs to be synced.
// If you don't know your TRV IDs, check the README or use the Shelly script console to log them.
const trv1ID = 201;
const trv2ID = 202;

// String component names, if needed later
const trv1 = "blutrv:" + trv1ID;
const trv2 = "blutrv:" + trv2ID;

/**
 * Given a TRV ID, returns the opposite TRV in the sync pair.
 * Used to determine where to mirror the temperature.
 */
function getOppositeTRV(id) {
  if (id === trv1ID) return trv2ID;
  if (id === trv2ID) return trv1ID;
  return null;  // Not part of the sync group
}

/**
 * Event listener for incoming status updates from Shelly BLU TRVs.
 * When a target temperature update is received, it mirrors the value
 * to the opposite TRV in the pair.
 */
Shelly.addStatusHandler(function (event) {
  // Only handle TRV events
  if (event.name !== "blutrv") return;

  print("-----------");
  print("Incoming event:", JSON.stringify(event));

  // Extract the new target temperature if present
  let newTargetTemp = event.delta["target_C"];
  if (newTargetTemp == null) {
    print("Message does not contain a target temp - ignoring.");
    return;
  }

  // Identify which TRV sent the update
  let id = event.id;
  print("TRV ID:", id);

  // Get the other TRV in the pair
  let targetId = getOppositeTRV(id);
  if (targetId === null) {
    print("Unknown or unmonitored TRV ID", id, "- ignoring.");
    return;
  }

  print("Opposite TRV ID:", targetId, ". New target temp is:", newTargetTemp);
  print("Sending message to opposite TRV...");

  // Send the new temperature to the other TRV
  setTrvTargetTemp(targetId, newTargetTemp);
});

/**
 * Sends a temperature update command to a specific Shelly BLU TRV.
 * @param {number} trvId - The ID of the TRV to update
 * @param {number} tempC - The target temperature to set (in Celsius)
 */
function setTrvTargetTemp(trvId, tempC) {
  Shelly.call("blutrv.call", {
    id: trvId,
    method: "Trv.SetTarget",
    params: {
      id: 0,           // Always 0 for the internal TRV component
      target_C: tempC  // Desired temperature
    }
  }, function (res, err_code, err_msg) {
    if (err_code === 0) {
      print("Set target temp to", tempC, "C on TRV", trvId);
    } else {
      print("Failed to set temp on TRV", trvId, "- Code:", err_code, "Msg:", err_msg || "Unknown");
    }
  });
}