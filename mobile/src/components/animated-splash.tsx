import { SplashScreen } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Text } from "@/components/ui/text";
import { COLORS } from "@/constants/theme";

const ANIMATION = require("../../assets/animations/brew-splash.json");

/**
 * Same size as `imageWidth` of the expo-splash-screen plugin in app.json: the
 * native splash image is frame 0 of the animation (scripts/brand/generate.py),
 * so when the native splash hides, nothing on screen moves.
 */
const SIZE = 200;
const FADE_OUT_MS = 300;
/** In case the animation never reports that it finished. */
const MAX_ANIMATION_MS = 2500;

type AnimatedSplashProps = {
  /** The app knows which screen to show (fonts loaded, sign-in state read). */
  ready: boolean;
  /** Faded out: unmount this. */
  onFinish: () => void;
};

/**
 * Second half of the splash, drawn by React over the app on a cold start.
 * 1. Takes over from the native splash with an identical first frame.
 * 2. Plays the Lottie animation (steam rises from the cup) while the app keeps loading.
 * 3. Fades out once both the animation and the app are done, never before the app is ready.
 * With "Reduce Motion" on, it skips the animation and only fades.
 */
export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const reduceMotion = useReducedMotion();
  const lottie = useRef<LottieView>(null);
  const [animationDone, setAnimationDone] = useState(reduceMotion);
  const opacity = useSharedValue(1);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    if (animationDone) return;
    const timer = setTimeout(() => setAnimationDone(true), MAX_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [animationDone]);

  useEffect(() => {
    if (!ready || !animationDone) return;
    opacity.set(
      withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
        if (finished) scheduleOnRN(onFinish);
      }),
    );
  }, [ready, animationDone, opacity, onFinish]);

  // Our first frame is on screen: now the native splash can go, then the animation starts.
  function handleLayout() {
    SplashScreen.hide();
    if (!reduceMotion) lottie.current?.play();
  }

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, fadeStyle]}
      onLayout={handleLayout}
      pointerEvents={animationDone && ready ? "none" : "auto"}
      accessible
      accessibilityLabel="Brew đang khởi động"
    >
      <LottieView
        ref={lottie}
        source={ANIMATION}
        autoPlay={false}
        loop={false}
        onAnimationFinish={() => setAnimationDone(true)}
        style={{ width: SIZE, height: SIZE }}
      />
      {/* Below the cup, so the cup itself stays exactly where the native splash drew it. */}
      <View style={styles.title} pointerEvents="none">
        <Animated.View entering={FadeInDown.delay(350).duration(450)}>
          <Text className="text-[32px] font-semibold tracking-wide text-white">Brew</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.night,
  },
  title: {
    position: "absolute",
    top: "50%",
    marginTop: SIZE * 0.3,
    alignItems: "center",
    gap: 4,
  },
});
