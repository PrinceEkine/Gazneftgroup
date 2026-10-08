package com.gazneftgroup.mail.ui.compose

import androidx.lifecycle.SavedStateHandle
import app.cash.turbine.test
import com.gazneftgroup.mail.core.common.AppError
import com.gazneftgroup.mail.core.common.AppResult
import com.gazneftgroup.mail.data.message.MessageRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ComposeEmailViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val repository = mockk<MessageRepository>()

    private fun viewModel() = ComposeEmailViewModel(
        savedStateHandle = SavedStateHandle(
            mapOf("accountId" to "acct-1", "to" to "", "subject" to "")
        ),
        messageRepository = repository,
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `send success flips sent flag`() = runTest(dispatcher) {
        coEvery { repository.send(any()) } returns AppResult.Success("msg-id")
        val vm = viewModel()
        vm.onToChanged("someone@example.com")
        vm.onBodyChanged("hello")

        vm.send()
        dispatcher.scheduler.advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertTrue(state.sent)
            assertFalse(state.isSending)
        }
    }

    @Test
    fun `send failure surfaces user-presentable error and allows retry`() = runTest(dispatcher) {
        coEvery { repository.send(any()) } returns AppResult.Error(AppError.NETWORK)
        val vm = viewModel()
        vm.onToChanged("someone@example.com")

        vm.send()
        dispatcher.scheduler.advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertEquals(AppError.NETWORK.userMessage, state.error)
            assertFalse(state.sent)
            assertTrue(state.canSend) // user can retry explicitly — sends are never auto-retried
        }
    }

    @Test
    fun `blank recipient never reaches the repository`() = runTest(dispatcher) {
        val vm = viewModel()
        vm.send()
        dispatcher.scheduler.advanceUntilIdle()
        coVerify(exactly = 0) { repository.send(any()) }
    }
}
