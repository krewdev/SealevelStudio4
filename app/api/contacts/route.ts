/**
 * Contacts API
 * Handles contact synchronization between client and server
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory store for contacts (in production, use a database)
const contactStore = new Map<string, any>();

/**
 * GET /api/contacts
 * Retrieve all contacts for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // In production, get user ID from session/auth
    const sessionId = request.cookies.get('session_id')?.value || 
                     request.headers.get('x-session-id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 401 }
      );
    }

    // Get contacts for this session
    const userContacts = Array.from(contactStore.values())
      .filter(contact => contact.sessionId === sessionId);

    return NextResponse.json({
      success: true,
      contacts: userContacts,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts
 * Sync contacts from client to server
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value || 
                     request.headers.get('x-session-id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { contacts } = body;

    if (!Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'Contacts must be an array' },
        { status: 400 }
      );
    }

    // Store contacts with session ID
    contacts.forEach((contact: any) => {
      const contactWithSession = {
        ...contact,
        sessionId,
        syncedAt: new Date().toISOString(),
      };
      contactStore.set(contact.id, contactWithSession);
    });

    return NextResponse.json({
      success: true,
      synced: contacts.length,
    });
  } catch (error) {
    console.error('Error syncing contacts:', error);
    return NextResponse.json(
      { error: 'Failed to sync contacts' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/:id
 * Delete a contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value || 
                     request.headers.get('x-session-id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 401 }
      );
    }

    const contactId = params.id;
    const contact = contactStore.get(contactId);

    if (!contact || contact.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    contactStore.delete(contactId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

