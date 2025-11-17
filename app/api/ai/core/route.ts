/**
 * Core AI Model API
 * Endpoints for managing the downloaded/local AI model
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeCoreModel, getCoreModel } from '@/app/lib/ai/core-model';

/**
 * GET /api/ai/core
 * Get core model status and info
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    const coreModel = getCoreModel() || initializeCoreModel();

    switch (action) {
      case 'status':
        const isConnected = await coreModel.testConnection();
        const info = coreModel.getModelInfo();
        return NextResponse.json({
          ...info,
          connected: isConnected,
        });

      case 'models':
        const models = await coreModel.getAvailableModels();
        return NextResponse.json({ models });

      default:
        return NextResponse.json(coreModel.getModelInfo());
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Failed to get core model info',
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/core
 * Query the core model or switch models
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, prompt, model, options } = body;

    const coreModel = getCoreModel() || initializeCoreModel();

    switch (action) {
      case 'query':
        if (!prompt) {
          return NextResponse.json({
            error: 'Prompt is required',
          }, { status: 400 });
        }

        const response = await coreModel.query(prompt, options);
        return NextResponse.json({ response });

      case 'consensus':
        if (!prompt) {
          return NextResponse.json({
            error: 'Prompt is required',
          }, { status: 400 });
        }

        const consensus = await coreModel.getConsensus(prompt, {
          includeCloudModels: body.includeCloudModels !== false,
          ...options,
        });
        return NextResponse.json(consensus);

      case 'switch-model':
        if (!model) {
          return NextResponse.json({
            error: 'Model name is required',
          }, { status: 400 });
        }

        const success = await coreModel.switchModel(model);
        return NextResponse.json({ success, model });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use: query, consensus, or switch-model',
        }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Failed to process request',
    }, { status: 500 });
  }
}

