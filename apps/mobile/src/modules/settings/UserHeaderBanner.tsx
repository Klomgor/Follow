import { cn, getLuminance } from "@follow/utils"
import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useState } from "react"
import { Animated, Image, StyleSheet, Text, View } from "react-native"
import ImageColors from "react-native-image-colors"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useWhoami } from "@/src/store/user/hooks"
import { accentColor } from "@/src/theme/colors"

const defaultGradientColors = ["#FF5C00", "#FF8533", "#FFA666"]

export const UserHeaderBanner = ({ scrollY }: { scrollY: Animated.Value }) => {
  const whoami = useWhoami()
  const insets = useSafeAreaInsets()

  const BANNER_HEIGHT = 200
  const MAX_PULL = 100
  const SCALE_FACTOR = 1.8
  const TRANSLATE_Y = -(BANNER_HEIGHT * (SCALE_FACTOR - 1)) / 2

  const [gradientColors, setGradientColors] = useState<string[]>(defaultGradientColors)
  const [gradientLight, setGradientLight] = useState<boolean>(false)

  useEffect(() => {
    const extractColors = async () => {
      if (!whoami?.image) return

      try {
        const result = await ImageColors.getColors(whoami.image, {
          fallback: accentColor,
          cache: true,
        })

        if (result.platform === "web") return
        if (result.platform === "android") {
          setGradientColors([
            result.dominant,
            result.average || result.vibrant,
            result.vibrant || result.dominant,
          ])

          const dominantLuminance = getLuminance(result.dominant)
          const isLight = dominantLuminance > 0.5
          setGradientLight(isLight)
        } else {
          const dominantLuminance = getLuminance(result.primary)
          const isLight = dominantLuminance > 0.5

          setGradientLight(isLight)
          setGradientColors([result.primary, result.secondary, result.background])
        }
      } catch (error) {
        console.warn("Failed to extract colors:", error)
      }
    }

    extractColors()
  }, [whoami?.image])

  if (!whoami) return null
  return (
    <View
      className="relative h-[200px] items-center justify-center"
      style={{ marginTop: -insets.top }}
    >
      <Animated.View
        className="absolute inset-0"
        style={{
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [-MAX_PULL, 0],
                outputRange: [TRANSLATE_Y, 0],
                extrapolateLeft: "extend",
                extrapolateRight: "clamp",
              }),
            },
            {
              scale: scrollY.interpolate({
                inputRange: [-MAX_PULL, 0],
                outputRange: [SCALE_FACTOR, 1],
                extrapolateLeft: "extend",
                extrapolateRight: "clamp",
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <View
        className="bg-system-background overflow-hidden rounded-full"
        style={{ marginTop: insets.top }}
      >
        {!!whoami.image && (
          <Image source={{ uri: whoami.image, height: 60, width: 60 }} resizeMode="cover" />
        )}
      </View>

      <View className="mt-2">
        <Text className={cn("text-2xl font-bold", gradientLight ? "text-black" : "text-white/95")}>
          {whoami.name}
        </Text>
        {!!whoami.handle && (
          <Text className={cn(gradientLight ? "text-black/70" : "text-white/70")}>
            @{whoami.handle}
          </Text>
        )}
      </View>
    </View>
  )
}