const { AndroidConfig, withAndroidColors, withAndroidStyles } = require('expo/config-plugins');

const { assignStylesValue, getAppThemeGroup } = AndroidConfig.Styles;
const SWITCH_STYLE = { name: 'Brew.Switch', parent: 'Widget.AppCompat.CompoundButton.Switch' };

/**
 * Brand colors for the Android widgets the app doesn't draw itself.
 * Applied on `npx expo prebuild`.
 *
 *   ["./plugins/with-android-theme", { "accentColor": "#C67C4E" }]
 *
 * - colorAccent: Alert buttons, text cursor and selection handles use it
 *   (AppCompat's default is teal).
 * - switchStyle: React Native's <Switch> thumb. RN's `thumbColor` only multiplies
 *   the thumb's theme tint (white × accent = accent), so a white thumb has to come
 *   from the theme. The track keeps the `trackColor` given in JS.
 */
module.exports = function withAndroidTheme(config, { accentColor }) {
  config = withAndroidColors(config, (mod) => {
    mod.modResults = AndroidConfig.Colors.assignColorValue(mod.modResults, {
      name: 'colorAccent',
      value: accentColor,
    });
    return mod;
  });
  return withAndroidStyles(config, (mod) => {
    let styles = mod.modResults;
    styles = assignStylesValue(styles, {
      add: true,
      parent: getAppThemeGroup(),
      name: 'colorAccent',
      value: '@color/colorAccent',
    });
    styles = assignStylesValue(styles, {
      add: true,
      parent: SWITCH_STYLE,
      name: 'thumbTint',
      value: '@android:color/white',
    });
    styles = assignStylesValue(styles, {
      add: true,
      parent: getAppThemeGroup(),
      name: 'switchStyle',
      value: `@style/${SWITCH_STYLE.name}`,
    });
    mod.modResults = styles;
    return mod;
  });
};
