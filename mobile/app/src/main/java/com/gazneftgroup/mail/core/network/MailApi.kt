package com.gazneftgroup.mail.core.network

import retrofit2.http.Body
import retrofit2.http.POST

interface MailApi {

    @POST("api/fetch-emails")
    suspend fun fetchEmails(@Body request: FetchEmailsRequest): FetchEmailsResponse

    @POST("api/fetch-message-body")
    suspend fun fetchMessageBody(@Body request: FetchMessageBodyRequest): FetchMessageBodyResponse

    @POST("api/update-flags")
    suspend fun updateFlags(@Body request: UpdateFlagsRequest): SimpleSuccessResponse

    @POST("api/send-email")
    suspend fun sendEmail(@Body request: SendEmailRequest): SendEmailResponse
}
