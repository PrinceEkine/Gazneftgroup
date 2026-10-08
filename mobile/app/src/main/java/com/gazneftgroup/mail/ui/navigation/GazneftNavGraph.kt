package com.gazneftgroup.mail.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.gazneftgroup.mail.ui.auth.AuthViewModel
import com.gazneftgroup.mail.ui.auth.SignInScreen
import com.gazneftgroup.mail.ui.compose.ComposeEmailScreen
import com.gazneftgroup.mail.ui.inbox.InboxScreen
import com.gazneftgroup.mail.ui.message.MessageDetailScreen
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

object Routes {
    const val SIGN_IN = "sign_in"
    const val INBOX = "inbox"
    const val MESSAGE = "message/{messageId}"
    const val COMPOSE = "compose?accountId={accountId}&to={to}&subject={subject}"

    fun message(messageId: String) =
        "message/${URLEncoder.encode(messageId, StandardCharsets.UTF_8)}"

    fun compose(accountId: String, to: String = "", subject: String = ""): String {
        fun enc(v: String) = URLEncoder.encode(v, StandardCharsets.UTF_8)
        return "compose?accountId=${enc(accountId)}&to=${enc(to)}&subject=${enc(subject)}"
    }
}

@Composable
fun GazneftNavGraph(authViewModel: AuthViewModel = hiltViewModel()) {
    val navController = rememberNavController()
    val user by authViewModel.user.collectAsState()

    NavHost(
        navController = navController,
        startDestination = if (user != null) Routes.INBOX else Routes.SIGN_IN,
    ) {
        composable(Routes.SIGN_IN) {
            SignInScreen(
                onSignedIn = {
                    navController.navigate(Routes.INBOX) {
                        popUpTo(Routes.SIGN_IN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.INBOX) {
            InboxScreen(
                onOpenMessage = { navController.navigate(Routes.message(it)) },
                onCompose = { accountId -> navController.navigate(Routes.compose(accountId)) },
                onSignOut = {
                    authViewModel.signOut()
                    navController.navigate(Routes.SIGN_IN) {
                        popUpTo(Routes.INBOX) { inclusive = true }
                    }
                },
            )
        }
        composable(
            Routes.MESSAGE,
            arguments = listOf(navArgument("messageId") { type = NavType.StringType }),
        ) {
            MessageDetailScreen(
                onBack = { navController.popBackStack() },
                onReply = { accountId, to, subject ->
                    navController.navigate(Routes.compose(accountId, to, subject))
                },
            )
        }
        composable(
            Routes.COMPOSE,
            arguments = listOf(
                navArgument("accountId") { type = NavType.StringType },
                navArgument("to") { type = NavType.StringType; defaultValue = "" },
                navArgument("subject") { type = NavType.StringType; defaultValue = "" },
            ),
        ) {
            ComposeEmailScreen(onDone = { navController.popBackStack() })
        }
    }
}
