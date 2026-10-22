package expo.modules.uiscale

import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UiScaleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UiScale")

    Function("getScale") {
      val ctx = appContext.reactContext ?: return@Function UiScale.DEFAULT.toDouble()
      UiScale.get(ctx).toDouble()
    }

    Function("setScale") { scale: Double ->
      val ctx = appContext.reactContext ?: return@Function
      UiScale.set(ctx, scale.toFloat())
    }

    // the new size is applied when the app starts, so restart it right away
    Function("restart") {
      val activity = appContext.currentActivity ?: return@Function
      val intent = activity.packageManager.getLaunchIntentForPackage(activity.packageName) ?: return@Function
      val restart = Intent.makeRestartActivityTask(intent.component)
      activity.startActivity(restart)
      Runtime.getRuntime().exit(0)
    }
  }
}
