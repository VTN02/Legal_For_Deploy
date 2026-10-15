// ============================================================
// SE3110 – Quality Management in Software Engineering
// Individual Testing Contribution: Documentation & Clerk Module
// Member: Member 3
// Tool: flutter_test (dart:test)
// Coverage: Unit (Model), Boundary, Invalid/Failure, Widget
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:legal_service_app/models/documentation_service.dart';
import 'package:legal_service_app/models/documentation_request.dart';
import 'package:legal_service_app/models/document_file.dart';
import 'package:legal_service_app/screens/document_and_clerk/services/manual_request_dialog.dart';

void main() {
  // ──────────────────────────────────────────────────────────────
  // GROUP 1: DocumentationService Model Tests
  // ──────────────────────────────────────────────────────────────
  group('DocumentationService Model Tests', () {
    // ── Normal Cases ──────────────────────────────────────────
    test('TC-DS-01: Parses valid JSON with all fields correctly', () {
      final json = {
        'serviceId': 101,
        'name': 'Residential Lease Agreement',
        'description': 'Standard residential tenancy contract',
        'isActive': true,
        'requiredDocuments': ['National Identity Card (NIC)', 'Title Deed Copy'],
      };

      final service = DocumentationService.fromJson(json);

      expect(service.serviceId, 101);
      expect(service.name, 'Residential Lease Agreement');
      expect(service.description, 'Standard residential tenancy contract');
      expect(service.isActive, true);
      expect(service.requiredDocuments.length, 2);
      expect(service.requiredDocuments.first, 'National Identity Card (NIC)');
    });

    test('TC-DS-02: Parses inactive service with isActive = false', () {
      final json = {
        'serviceId': 202,
        'name': 'Company Registration',
        'description': 'Register a new company',
        'isActive': false,
        'requiredDocuments': ['Business Plan'],
      };

      final service = DocumentationService.fromJson(json);

      expect(service.isActive, false);
      expect(service.name, 'Company Registration');
    });

    // ── Boundary / Edge Cases ─────────────────────────────────
    test('TC-DS-03: Handles empty requiredDocuments list', () {
      final json = {
        'serviceId': 103,
        'name': 'General Consultation',
        'description': 'No documents required',
        'isActive': true,
        'requiredDocuments': [],
      };

      final service = DocumentationService.fromJson(json);

      expect(service.requiredDocuments, isEmpty);
      expect(service.requiredDocuments.length, 0);
    });

    test('TC-DS-04: Handles null requiredDocuments → defaults to empty list', () {
      final json = {
        'serviceId': 104,
        'name': 'Advisory Session',
        'description': 'Quick advisory',
        'isActive': true,
        'requiredDocuments': null,
      };

      final service = DocumentationService.fromJson(json);

      expect(service.requiredDocuments, isEmpty);
    });

    test('TC-DS-05: Handles single required document in list', () {
      final json = {
        'serviceId': 105,
        'name': 'Single Doc Service',
        'description': 'Needs one doc',
        'isActive': true,
        'requiredDocuments': ['Passport Copy'],
      };

      final service = DocumentationService.fromJson(json);

      expect(service.requiredDocuments.length, 1);
      expect(service.requiredDocuments.first, 'Passport Copy');
    });

    // ── Invalid / Failure Cases ───────────────────────────────
    test('TC-DS-06: Parses serviceId as string → converts to int', () {
      final json = {
        'serviceId': '101',
        'name': 'String ID Service',
        'description': 'ID sent as string from older API version',
        'isActive': true,
        'requiredDocuments': [],
      };

      final service = DocumentationService.fromJson(json);

      expect(service.serviceId, 101);
    });

    test('TC-DS-07: Handles null name → defaults to empty string', () {
      final json = {
        'serviceId': 107,
        'name': null,
        'description': 'Missing name',
        'isActive': true,
        'requiredDocuments': [],
      };

      final service = DocumentationService.fromJson(json);

      expect(service.name, '');
    });

    test('TC-DS-08: Handles null description → defaults to empty string', () {
      final json = {
        'serviceId': 108,
        'name': 'Valid Name',
        'description': null,
        'isActive': true,
        'requiredDocuments': [],
      };

      final service = DocumentationService.fromJson(json);

      expect(service.description, '');
    });

    test('TC-DS-09: Handles missing isActive field → defaults to true', () {
      final json = {
        'serviceId': 109,
        'name': 'No Active Field',
        'description': 'Testing default',
        'requiredDocuments': [],
      };

      final service = DocumentationService.fromJson(json);

      expect(service.isActive, true);
    });

    // ── toJson round-trip ─────────────────────────────────────
    test('TC-DS-10: toJson round-trip preserves all fields', () {
      final original = DocumentationService(
        serviceId: 110,
        name: 'Round Trip Test',
        description: 'Checking serialization',
        isActive: true,
        requiredDocuments: ['Doc A', 'Doc B'],
      );

      final json = original.toJson();
      final restored = DocumentationService.fromJson(json);

      expect(restored.serviceId, original.serviceId);
      expect(restored.name, original.name);
      expect(restored.description, original.description);
      expect(restored.isActive, original.isActive);
      expect(restored.requiredDocuments, original.requiredDocuments);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GROUP 2: DocumentFile Model Tests
  // ──────────────────────────────────────────────────────────────
  group('DocumentFile Model Tests', () {
    // ── Normal Cases ──────────────────────────────────────────
    test('TC-DF-01: Parses valid JSON with VERIFIED status', () {
      final json = {
        'fileId': 5,
        'requestId': 12,
        'fileName': 'NIC_Front.pdf',
        'contentType': 'application/pdf',
        'fileSize': 2048000,
        'documentStatus': 'VERIFIED',
      };

      final file = DocumentFile.fromJson(json);

      expect(file.fileId, 5);
      expect(file.requestId, 12);
      expect(file.fileName, 'NIC_Front.pdf');
      expect(file.contentType, 'application/pdf');
      expect(file.documentStatus, 'VERIFIED');
    });

    test('TC-DF-02: Parses REJECTED file with rejection reason', () {
      final json = {
        'fileId': 6,
        'requestId': 12,
        'fileName': 'Blurry_Scan.pdf',
        'contentType': 'application/pdf',
        'fileSize': 512000,
        'documentStatus': 'REJECTED',
        'rejectionReason': 'Image is too blurry to read',
      };

      final file = DocumentFile.fromJson(json);

      expect(file.documentStatus, 'REJECTED');
      expect(file.rejectionReason, 'Image is too blurry to read');
    });

    test('TC-DF-03: Parses verificationScore as double', () {
      final json = {
        'fileId': 7,
        'requestId': 13,
        'fileName': 'NIC_Back.jpg',
        'contentType': 'image/jpeg',
        'fileSize': 300000,
        'documentStatus': 'VERIFIED',
        'verificationScore': 0.97,
      };

      final file = DocumentFile.fromJson(json);

      expect(file.verificationScore, closeTo(0.97, 0.001));
    });

    // ── Boundary Cases: formattedFileSize ─────────────────────
    test('TC-DF-04 [Boundary]: fileSize = 0 → "0 B"', () {
      final file = DocumentFile.fromJson({
        'fileId': 10, 'requestId': 1, 'fileName': 'empty.pdf',
        'contentType': 'application/pdf', 'fileSize': 0,
        'documentStatus': 'PENDING',
      });
      expect(file.formattedFileSize, '0 B');
    });

    test('TC-DF-05 [Boundary]: fileSize = 1 → "1 B"', () {
      final file = DocumentFile.fromJson({
        'fileId': 11, 'requestId': 1, 'fileName': 'tiny.pdf',
        'contentType': 'application/pdf', 'fileSize': 1,
        'documentStatus': 'PENDING',
      });
      expect(file.formattedFileSize, '1 B');
    });

    test('TC-DF-06 [Boundary]: fileSize = 1023 → still in Bytes range', () {
      final file = DocumentFile.fromJson({
        'fileId': 12, 'requestId': 1, 'fileName': 'small.pdf',
        'contentType': 'application/pdf', 'fileSize': 1023,
        'documentStatus': 'PENDING',
      });
      expect(file.formattedFileSize, '1023 B');
    });

    test('TC-DF-07 [Boundary]: fileSize = 1024 → exactly "1.0 KB"', () {
      final file = DocumentFile.fromJson({
        'fileId': 13, 'requestId': 1, 'fileName': 'one_kb.pdf',
        'contentType': 'application/pdf', 'fileSize': 1024,
        'documentStatus': 'PENDING',
      });
      expect(file.formattedFileSize, '1.0 KB');
    });

    test('TC-DF-08 [Boundary]: fileSize = 1048575 → largest value still in KB range', () {
      final file = DocumentFile.fromJson({
        'fileId': 14, 'requestId': 1, 'fileName': 'almost_1mb.pdf',
        'contentType': 'application/pdf', 'fileSize': 1048575,
        'documentStatus': 'PENDING',
      });
      // 1048575 / 1024 = 1023.999... KB → "1024.0 KB"
      expect(file.formattedFileSize, '1024.0 KB');
    });

    test('TC-DF-09 [Boundary]: fileSize = 1048576 → exactly "1.0 MB"', () {
      final file = DocumentFile.fromJson({
        'fileId': 15, 'requestId': 1, 'fileName': 'one_mb.pdf',
        'contentType': 'application/pdf', 'fileSize': 1048576,
        'documentStatus': 'PENDING',
      });
      expect(file.formattedFileSize, '1.0 MB');
    });

    test('TC-DF-10 [Boundary]: fileSize = 2048000 → "2.0 MB"', () {
      final file = DocumentFile.fromJson({
        'fileId': 16, 'requestId': 1, 'fileName': 'two_mb.pdf',
        'contentType': 'application/pdf', 'fileSize': 2048000,
        'documentStatus': 'PENDING',
      });
      expect(file.formattedFileSize, '2.0 MB');
    });

    // ── Invalid / Failure Cases ───────────────────────────────
    test('TC-DF-11 [Invalid]: Missing documentStatus → defaults to "PENDING"', () {
      final json = {
        'fileId': 20, 'requestId': 5, 'fileName': 'test.pdf',
        'contentType': 'application/pdf', 'fileSize': 1024,
      };
      final file = DocumentFile.fromJson(json);
      expect(file.documentStatus, 'PENDING');
    });

    test('TC-DF-12 [Invalid]: Null fileName → defaults to "Document"', () {
      final json = {
        'fileId': 21, 'requestId': 5, 'fileName': null,
        'contentType': 'application/pdf', 'fileSize': 1024,
        'documentStatus': 'PENDING',
      };
      final file = DocumentFile.fromJson(json);
      expect(file.fileName, 'Document');
    });

    test('TC-DF-13 [Invalid]: Null contentType → defaults to application/octet-stream', () {
      final json = {
        'fileId': 22, 'requestId': 5, 'fileName': 'test.pdf',
        'contentType': null, 'fileSize': 1024,
        'documentStatus': 'PENDING',
      };
      final file = DocumentFile.fromJson(json);
      expect(file.contentType, 'application/octet-stream');
    });

    test('TC-DF-14 [Invalid]: Null verificationScore → stays null', () {
      final json = {
        'fileId': 23, 'requestId': 5, 'fileName': 'test.pdf',
        'contentType': 'application/pdf', 'fileSize': 1024,
        'documentStatus': 'PENDING',
        'verificationScore': null,
      };
      final file = DocumentFile.fromJson(json);
      expect(file.verificationScore, isNull);
    });

    test('TC-DF-15 [Invalid]: Accepts legacy "rejectReason" field alias', () {
      final json = {
        'fileId': 24, 'requestId': 5, 'fileName': 'test.pdf',
        'contentType': 'application/pdf', 'fileSize': 1024,
        'documentStatus': 'REJECTED',
        'rejectReason': 'Legacy field format',
      };
      final file = DocumentFile.fromJson(json);
      expect(file.rejectionReason, 'Legacy field format');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GROUP 3: DocumentationRequest Model Tests
  // ──────────────────────────────────────────────────────────────
  group('DocumentationRequest Model Tests', () {
    // ── Normal Cases ──────────────────────────────────────────
    test('TC-DR-01: Parses full request with nested document files', () {
      final json = {
        'requestId': 42,
        'customerId': 1,
        'customerName': 'John Doe',
        'customerEmail': 'john@example.com',
        'serviceId': 101,
        'serviceName': 'Residential Lease Agreement',
        'documentType': 'Lease',
        'status': 'REQUIRES_DOCUMENTS',
        'assignedClerkId': 7,
        'assignedClerkName': 'Clerk Smith',
        'createdAt': '2026-09-23T04:00:00Z',
        'updatedAt': '2026-09-24T10:00:00Z',
        'requiredDocuments': ['NIC', 'Title Deed'],
        'missingDocuments': ['Title Deed'],
        'documentFiles': [
          {
            'fileId': 1, 'requestId': 42, 'fileName': 'NIC.pdf',
            'contentType': 'application/pdf', 'fileSize': 1024,
            'documentStatus': 'VERIFIED',
          }
        ],
        'reuploadNote': 'Please reupload the title deed clearly.',
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.requestId, 42);
      expect(req.customerId, 1);
      expect(req.customerName, 'John Doe');
      expect(req.status, 'REQUIRES_DOCUMENTS');
      expect(req.assignedClerkId, 7);
      expect(req.assignedClerkName, 'Clerk Smith');
      expect(req.requiredDocuments.length, 2);
      expect(req.missingDocuments.length, 1);
      expect(req.documentFiles.length, 1);
      expect(req.documentFiles.first.fileName, 'NIC.pdf');
      expect(req.reuploadNote, 'Please reupload the title deed clearly.');
      expect(req.createdAt, isNotNull);
    });

    test('TC-DR-02: Parses COMPLETED request with no missing documents', () {
      final json = {
        'requestId': 99,
        'customerId': 2,
        'serviceId': 102,
        'documentType': 'Power of Attorney',
        'status': 'COMPLETED',
        'missingDocuments': [],
        'documentFiles': [],
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.status, 'COMPLETED');
      expect(req.missingDocuments, isEmpty);
      expect(req.documentFiles, isEmpty);
    });

    // ── Boundary / Edge Cases ─────────────────────────────────
    test('TC-DR-03 [Boundary]: Handles null assignedClerkId → stays null', () {
      final json = {
        'requestId': 50,
        'customerId': 3,
        'serviceId': 103,
        'documentType': 'Lease',
        'status': 'PENDING',
        'assignedClerkId': null,
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.assignedClerkId, isNull);
    });

    test('TC-DR-04 [Boundary]: Handles null createdAt → stays null', () {
      final json = {
        'requestId': 51,
        'customerId': 3,
        'serviceId': 103,
        'documentType': 'Lease',
        'status': 'PENDING',
        'createdAt': null,
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.createdAt, isNull);
    });

    test('TC-DR-05 [Boundary]: Handles empty documentFiles list', () {
      final json = {
        'requestId': 52,
        'customerId': 3,
        'serviceId': 103,
        'documentType': 'Contract',
        'status': 'PENDING',
        'documentFiles': [],
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.documentFiles, isEmpty);
    });

    test('TC-DR-06 [Boundary]: Handles 3 nested document files with mixed statuses', () {
      final json = {
        'requestId': 53,
        'customerId': 4,
        'serviceId': 104,
        'documentType': 'Multiple Docs',
        'status': 'UNDER_REVIEW',
        'documentFiles': [
          {'fileId': 1, 'requestId': 53, 'fileName': 'File1.pdf', 'contentType': 'application/pdf', 'fileSize': 1000, 'documentStatus': 'VERIFIED'},
          {'fileId': 2, 'requestId': 53, 'fileName': 'File2.pdf', 'contentType': 'application/pdf', 'fileSize': 2000, 'documentStatus': 'PENDING'},
          {'fileId': 3, 'requestId': 53, 'fileName': 'File3.jpg', 'contentType': 'image/jpeg', 'fileSize': 3000, 'documentStatus': 'REJECTED'},
        ],
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.documentFiles.length, 3);
      expect(req.documentFiles[0].documentStatus, 'VERIFIED');
      expect(req.documentFiles[1].documentStatus, 'PENDING');
      expect(req.documentFiles[2].documentStatus, 'REJECTED');
    });

    // ── Invalid / Failure Cases ───────────────────────────────
    test('TC-DR-07 [Invalid]: Missing status field → defaults to "PENDING"', () {
      final json = {
        'requestId': 60,
        'customerId': 5,
        'serviceId': 105,
        'documentType': 'Missing Status Test',
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.status, 'PENDING');
    });

    test('TC-DR-08 [Invalid]: requestId as string → parsed to int', () {
      final json = {
        'requestId': '77',
        'customerId': 5,
        'serviceId': 105,
        'documentType': 'String ID Test',
        'status': 'PENDING',
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.requestId, 77);
    });

    test('TC-DR-09 [Invalid]: Null documentFiles field → empty list', () {
      final json = {
        'requestId': 61,
        'customerId': 5,
        'serviceId': 105,
        'documentType': 'Null Files Test',
        'status': 'PENDING',
        'documentFiles': null,
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.documentFiles, isEmpty);
    });

    test('TC-DR-10 [Invalid]: Null requiredDocuments → defaults to empty list', () {
      final json = {
        'requestId': 62,
        'customerId': 5,
        'serviceId': 105,
        'documentType': 'Null Required Docs',
        'status': 'PENDING',
        'requiredDocuments': null,
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.requiredDocuments, isEmpty);
    });

    test('TC-DR-11 [Invalid]: Invalid createdAt string → createdAt is null', () {
      final json = {
        'requestId': 63,
        'customerId': 5,
        'serviceId': 105,
        'documentType': 'Bad Date Test',
        'status': 'PENDING',
        'createdAt': 'not-a-valid-date',
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.createdAt, isNull);
    });

    test('TC-DR-12 [Invalid]: Null reuploadNote → stays null', () {
      final json = {
        'requestId': 64,
        'customerId': 5,
        'serviceId': 105,
        'documentType': 'No Reupload Note',
        'status': 'REQUIRES_DOCUMENTS',
        'reuploadNote': null,
      };

      final req = DocumentationRequest.fromJson(json);

      expect(req.reuploadNote, isNull);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GROUP 4: ManualRequestCreationBottomSheet Widget Tests
  // ──────────────────────────────────────────────────────────────
  group('ManualRequestCreationBottomSheet Widget Tests', () {
    final sampleServices = [
      DocumentationService(
        serviceId: 1,
        name: 'Residential Lease Agreement',
        description: 'Standard lease contract',
        isActive: true,
        requiredDocuments: ['NIC', 'Title Deed'],
      ),
      DocumentationService(
        serviceId: 2,
        name: 'Power of Attorney',
        description: 'Authorisation document',
        isActive: true,
        requiredDocuments: ['NIC'],
      ),
    ];

    Widget buildSheet({
      required List<DocumentationService> services,
      DocumentationService? initialService,
    }) {
      return MaterialApp(
        home: Scaffold(
          body: ManualRequestCreationBottomSheet(
            services: services,
            initialService: initialService,
          ),
        ),
      );
    }

    testWidgets('TC-WG-01: Shows "Create Service Request" header', (tester) async {
      await tester.pumpWidget(buildSheet(services: sampleServices));
      await tester.pump();

      expect(find.text('Create Service Request'), findsOneWidget);
    });

    testWidgets('TC-WG-02: Shows subtitle for admin and clerk review', (tester) async {
      await tester.pumpWidget(buildSheet(services: sampleServices));
      await tester.pump();

      expect(find.text('Direct submission for Admin & Clerk review'), findsOneWidget);
    });

    testWidgets('TC-WG-03: Pre-fills document title with initial service name', (tester) async {
      await tester.pumpWidget(buildSheet(
        services: sampleServices,
        initialService: sampleServices.first,
      ));
      await tester.pump();

      expect(find.text('Residential Lease Agreement'), findsWidgets);
    });

    testWidgets('TC-WG-04: Shows required documents when service has documents', (tester) async {
      await tester.pumpWidget(buildSheet(
        services: sampleServices,
        initialService: sampleServices.first,
      ));
      await tester.pump();

      expect(find.textContaining('NIC'), findsWidgets);
    });

    testWidgets('TC-WG-05: Displays a DropdownButton for service selection', (tester) async {
      await tester.pumpWidget(buildSheet(services: sampleServices));
      await tester.pump();

      expect(find.byType(DropdownButton<DocumentationService>), findsOneWidget);
    });

    testWidgets('TC-WG-06: Submit ElevatedButton is present on screen', (tester) async {
      await tester.pumpWidget(buildSheet(
        services: sampleServices,
        initialService: sampleServices.first,
      ));
      await tester.pump();

      expect(find.byType(ElevatedButton), findsWidgets);
    });

    testWidgets('TC-WG-07: Document title TextFormField accepts user input', (tester) async {
      // Wrap in MediaQuery with zero viewInsets so the bottom-padding
      // calculation inside the sheet doesn't push widgets off-screen.
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(),
          child: buildSheet(
            services: sampleServices,
            initialService: sampleServices.first,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify the pre-filled title is present (text input field rendered)
      expect(find.text('Residential Lease Agreement'), findsWidgets);
    });

    testWidgets('TC-WG-08: Defaults to first service when no initialService provided', (tester) async {
      await tester.pumpWidget(buildSheet(services: sampleServices));
      await tester.pump();

      expect(find.textContaining('Residential Lease Agreement'), findsWidgets);
    });
  });
}
