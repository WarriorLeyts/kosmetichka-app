package expo.modules.uiscale

import android.content.Context
import android.content.res.Configuration
import kotlin.math.roundToInt

/**
 * App-wide interface size. Works like Android's own «Display size» setting, but only for this app:
 * the density of the app's context is multiplied by the chosen factor, so text, icons, paddings and
 * cards all shrink or grow together. Applied in MainApplication / MainActivity attachBaseContext.
 */
object UiScale {
  private const val PREFS = "kosmetichka_ui_scale"
  private const val KEY = "scale"
  const val DEFAULT = 0.9f

  fun get(ctx: Context): Float =
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getFloat(KEY, DEFAULT).coerceIn(0.7f, 1.3f)

  fun set(ctx: Context, scale: Float) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putFloat(KEY, scale.coerceIn(0.7f, 1.3f)).commit()
  }

  @JvmStatic
  fun wrap(base: Context): Context {
    val scale = try { get(base) } catch (e: Exception) { 1f }
    if (scale == 1f) return base
    val conf = Configuration(base.resources.configuration)
    conf.densityDpi = (conf.densityDpi * scale).roundToInt()
    return base.createConfigurationContext(conf)
  }
}
