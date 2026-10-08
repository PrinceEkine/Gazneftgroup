package com.gazneftgroup.mail.ui.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gazneftgroup.mail.BuildConfig
import com.gazneftgroup.mail.core.common.AppError
import com.gazneftgroup.mail.core.common.AppResult
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.gazneftgroup.mail.data.auth.AuthRepository
import com.gazneftgroup.mail.domain.model.UserProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val signedIn: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    val user: StateFlow<UserProfile?> = authRepository.observeAuthState()
        .stateIn(viewModelScope, SharingStarted.Eagerly, authRepository.currentUser)

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun signIn(email: String, password: String) = authenticate {
        authRepository.signIn(email.trim(), password)
    }

    fun signUp(email: String, password: String) = authenticate {
        authRepository.signUp(email.trim(), password)
    }

    /**
     * Google sign-in / sign-up via Credential Manager. [activityContext] must be
     * an Activity: the account picker is a system UI. One button covers both
     * sign-in and sign-up, as on the website.
     */
    fun signInWithGoogle(activityContext: Context) {
        val clientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
        if (clientId.isBlank()) {
            _uiState.value = AuthUiState(error = AppError.GOOGLE_NOT_CONFIGURED.userMessage)
            return
        }
        viewModelScope.launch {
            _uiState.value = AuthUiState(isLoading = true)
            val idToken = try {
                val option = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(clientId)
                    .setAutoSelectEnabled(false)
                    .build()
                val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                val credential = CredentialManager.create(activityContext)
                    .getCredential(activityContext, request)
                    .credential
                if (credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    GoogleIdTokenCredential.createFrom(credential.data).idToken
                } else {
                    _uiState.value = AuthUiState(error = AppError.UNKNOWN.userMessage)
                    return@launch
                }
            } catch (e: GetCredentialCancellationException) {
                _uiState.value = AuthUiState()
                return@launch
            } catch (e: NoCredentialException) {
                _uiState.value = AuthUiState(error = AppError.NO_GOOGLE_ACCOUNT.userMessage)
                return@launch
            } catch (e: GetCredentialException) {
                _uiState.value = AuthUiState(error = AppError.GOOGLE_NOT_CONFIGURED.userMessage)
                return@launch
            }
            _uiState.value = when (val result = authRepository.signInWithGoogle(idToken)) {
                is AppResult.Success -> AuthUiState(signedIn = true)
                is AppResult.Error -> AuthUiState(error = result.error.userMessage)
            }
        }
    }

    fun signOut() = authRepository.signOut()

    private fun authenticate(block: suspend () -> AppResult<UserProfile>) {
        viewModelScope.launch {
            _uiState.value = AuthUiState(isLoading = true)
            _uiState.value = when (val result = block()) {
                is AppResult.Success -> AuthUiState(signedIn = true)
                is AppResult.Error -> AuthUiState(error = result.error.userMessage)
            }
        }
    }
}
