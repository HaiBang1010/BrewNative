import { isOnline } from '../network';

describe('isOnline', () => {
  it('is online when connected and the internet is reachable', () => {
    expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it('is offline without a connection, or when the internet cannot be reached (e.g. Wi-Fi without internet)', () => {
    expect(isOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('treats "not known yet" as online', () => {
    expect(isOnline({ isConnected: null, isInternetReachable: null })).toBe(true);
    expect(isOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
  });
});
