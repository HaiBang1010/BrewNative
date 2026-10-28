/**
 * Whether the device can reach the internet, from what NetInfo reports.
 * NetInfo uses null for "not known yet" (e.g. right after start, before its
 * reachability check): count that as online, so the app never blocks the
 * customer on a guess. Only an explicit `false` means offline.
 */
export function isOnline(state: { isConnected: boolean | null; isInternetReachable: boolean | null }): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}
