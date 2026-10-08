package com.gazneftgroup.mail.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gazneftgroup.mail.core.common.AppResult
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
